import {
  classify,
  diagnose,
  DirectoryNode,
  ByteSize,
  type AbsolutePath,
  type ClassificationResult,
  type DiagnosisPolicy,
  type Finding,
  type Removal,
  type RuleIndex,
  type ScanIssue,
  type ScanPolicy,
  type ScanScope,
  type ScanSnapshot,
  reviseTree,
} from "../../domain/index.ts";
import type { Clock } from "../ports/clock.ts";
import {
  ScanEventKind,
  type DiskScanner,
  type ScanProgress,
  type ScanRequest,
} from "../ports/disk-scanner.ts";

export const DiagnosisUpdateKind = {
  Progress: "progress",
  PreliminaryFindings: "preliminary-findings",
  Completed: "completed",
  Failed: "failed",
} as const;
export type DiagnosisUpdateKind = (typeof DiagnosisUpdateKind)[keyof typeof DiagnosisUpdateKind];

export const DiagnosisStage = {
  KnownLocations: "known-locations",
  FullScan: "full-scan",
} as const;
export type DiagnosisStage = (typeof DiagnosisStage)[keyof typeof DiagnosisStage];

export interface DiagnosisReport {
  readonly snapshot: ScanSnapshot;
  readonly classification: ClassificationResult;
  readonly findings: readonly Finding[];
}

export type DiagnosisUpdate =
  | {
      readonly kind: typeof DiagnosisUpdateKind.Progress;
      readonly stage: DiagnosisStage;
      readonly progress: ScanProgress;
    }
  | {
      readonly kind: typeof DiagnosisUpdateKind.PreliminaryFindings;
      /** Covers only the folders measured so far, each of them completely. */
      readonly report: DiagnosisReport;
    }
  | { readonly kind: typeof DiagnosisUpdateKind.Completed; readonly report: DiagnosisReport }
  | { readonly kind: typeof DiagnosisUpdateKind.Failed; readonly reason: string };

export interface DiagnoseDiskDependencies {
  readonly scanner: DiskScanner;
  readonly ruleIndex: RuleIndex;
  readonly personalFileExtensions: ReadonlySet<string>;
  readonly scanPolicy: ScanPolicy;
  readonly diagnosisPolicy: DiagnosisPolicy;
  readonly clock: Clock;
}

const outermostOnly = (paths: readonly AbsolutePath[]): AbsolutePath[] =>
  paths.filter((path) => !paths.some((other) => path.isInside(other)));

export class DiagnoseDisk {
  constructor(private readonly dependencies: DiagnoseDiskDependencies) {}

  async *run(scope: ScanScope, signal?: AbortSignal): AsyncGenerator<DiagnosisUpdate> {
    const { root } = scope;
    const hotspots = { folders: new Array<DirectoryNode>(), issues: new Array<ScanIssue>() };
    for (const path of this.hotspotPathsWithin(root)) {
      for await (const event of this.dependencies.scanner.scan({
        ...this.scanRequest(path, signal),
        excludedPaths: scope.excludedPaths,
      })) {
        if (event.kind === ScanEventKind.Progress) {
          yield {
            kind: DiagnosisUpdateKind.Progress,
            stage: DiagnosisStage.KnownLocations,
            progress: event,
          };
        }
        if (event.kind !== ScanEventKind.Finished) continue;
        const hotspotMissing = event.snapshot.issues.some((issue) => issue.path.equals(path));
        if (hotspotMissing) continue;
        hotspots.folders.push(event.snapshot.root);
        hotspots.issues.push(...event.snapshot.issues);
        yield this.preliminaryFindings(root, hotspots.folders);
      }
    }

    const completedTopLevel: DirectoryNode[] = [];
    const alreadyScanned = new Map(
      hotspots.folders.map((folder) => [folder.path.toString(), folder]),
    );
    for await (const event of this.dependencies.scanner.scan({
      ...this.scanRequest(root, signal, alreadyScanned),
      volumesOf: scope.volumesOf,
      excludedPaths: scope.excludedPaths,
    })) {
      switch (event.kind) {
        case ScanEventKind.Progress:
          yield {
            kind: DiagnosisUpdateKind.Progress,
            stage: DiagnosisStage.FullScan,
            progress: event,
          };
          break;
        case ScanEventKind.TopLevelFolderCompleted: {
          completedTopLevel.push(event.folder);
          const pendingHotspots = hotspots.folders.filter(
            (folder) => !completedTopLevel.some((done) => folder.path.isSameOrInside(done.path)),
          );
          yield this.preliminaryFindings(root, [...completedTopLevel, ...pendingHotspots]);
          break;
        }
        case ScanEventKind.Finished:
          yield {
            kind: DiagnosisUpdateKind.Completed,
            report: this.report({
              ...event.snapshot,
              issues: [...hotspots.issues, ...event.snapshot.issues],
            }),
          };
          break;
        case ScanEventKind.Failed:
          yield { kind: DiagnosisUpdateKind.Failed, reason: event.reason };
          break;
      }
    }
  }

  /**
   * The report after a cleanup, without scanning everything again: removed items leave the tree,
   * and folders a tool changed in ways that can't be told in advance are measured once more.
   */
  async refresh(
    report: DiagnosisReport,
    removals: readonly Removal[],
    remeasure: readonly AbsolutePath[],
  ): Promise<DiagnosisReport> {
    const measured = await Promise.all(remeasure.map((path) => this.measure(path)));
    const missing = remeasure.filter((_, index) => measured[index] === undefined);
    const root = reviseTree(report.snapshot.root, {
      removals: [...removals, ...missing.map((path) => ({ path, size: ByteSize.zero }))],
      replacements: measured.filter((node) => node !== undefined),
    });
    return this.report({ ...report.snapshot, root });
  }

  private async measure(path: AbsolutePath): Promise<DirectoryNode | undefined> {
    for await (const event of this.dependencies.scanner.scan(this.scanRequest(path, undefined))) {
      if (event.kind !== ScanEventKind.Finished) continue;
      const gone = event.snapshot.issues.some((issue) => issue.path.equals(path));
      return gone ? undefined : event.snapshot.root;
    }
    return undefined;
  }

  private scanRequest(
    root: AbsolutePath,
    signal: AbortSignal | undefined,
    alreadyScanned?: ReadonlyMap<string, DirectoryNode>,
  ): ScanRequest {
    const { ruleIndex, scanPolicy, personalFileExtensions } = this.dependencies;
    return {
      root,
      markerFileNames: ruleIndex.markerFileNames,
      personalFileExtensions,
      notableFileMinimumSize: scanPolicy.notableFileMinimumSize,
      ...(alreadyScanned === undefined ? {} : { alreadyScanned }),
      ...(signal === undefined ? {} : { signal }),
    };
  }

  private hotspotPathsWithin(root: AbsolutePath): readonly AbsolutePath[] {
    return outermostOnly(
      this.dependencies.ruleIndex.hotspots
        .map((hotspot) => hotspot.path)
        .filter((path) => path.isSameOrInside(root)),
    );
  }

  private preliminaryFindings(
    root: AbsolutePath,
    folders: readonly DirectoryNode[],
  ): DiagnosisUpdate {
    const partialRoot = DirectoryNode.assemble({
      path: root,
      identity: undefined,
      ownFilesSize: ByteSize.zero,
      ownFileCount: 0,
      ownPersonalFileCount: 0,
      lastModified: this.dependencies.clock.now(),
      notableFiles: [],
      markerFiles: new Set(),
      children: folders,
    });
    return {
      kind: DiagnosisUpdateKind.PreliminaryFindings,
      report: this.report({
        root: partialRoot,
        issues: [],
        startedAt: partialRoot.lastModified,
        finishedAt: partialRoot.lastModified,
      }),
    };
  }

  private report(snapshot: ScanSnapshot): DiagnosisReport {
    const { ruleIndex, diagnosisPolicy, clock } = this.dependencies;
    const classification = classify(snapshot.root, ruleIndex);
    const findings = diagnose({
      root: snapshot.root,
      classification,
      policy: diagnosisPolicy,
      now: clock.now(),
    });
    return { snapshot, classification, findings };
  }
}
