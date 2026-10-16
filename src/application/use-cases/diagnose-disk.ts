import {
  classify,
  diagnose,
  DirectoryNode,
  ByteSize,
  type AbsolutePath,
  type ClassificationResult,
  type DiagnosisPolicy,
  type Finding,
  type RuleIndex,
  type ScanIssue,
  type ScanPolicy,
  type ScanSnapshot,
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

export interface DiagnosisReport {
  readonly snapshot: ScanSnapshot;
  readonly classification: ClassificationResult;
  readonly findings: readonly Finding[];
}

export type DiagnosisUpdate =
  | { readonly kind: typeof DiagnosisUpdateKind.Progress; readonly progress: ScanProgress }
  | {
      readonly kind: typeof DiagnosisUpdateKind.PreliminaryFindings;
      readonly findings: readonly Finding[];
    }
  | { readonly kind: typeof DiagnosisUpdateKind.Completed; readonly report: DiagnosisReport }
  | { readonly kind: typeof DiagnosisUpdateKind.Failed; readonly reason: string };

export interface DiagnoseDiskDependencies {
  readonly scanner: DiskScanner;
  readonly ruleIndex: RuleIndex;
  readonly scanPolicy: ScanPolicy;
  readonly diagnosisPolicy: DiagnosisPolicy;
  readonly clock: Clock;
}

interface HotspotScan {
  readonly folders: readonly DirectoryNode[];
  readonly issues: readonly ScanIssue[];
}

const outermostOnly = (paths: readonly AbsolutePath[]): AbsolutePath[] =>
  paths.filter((path) => !paths.some((other) => path.isInside(other)));

export class DiagnoseDisk {
  constructor(private readonly dependencies: DiagnoseDiskDependencies) {}

  async *run(root: AbsolutePath, signal?: AbortSignal): AsyncGenerator<DiagnosisUpdate> {
    const hotspots = await this.scanHotspots(root, signal);
    if (hotspots.folders.length > 0) {
      yield this.preliminaryFindings(root, hotspots.folders);
    }

    const completedTopLevel: DirectoryNode[] = [];
    const alreadyScanned = new Map(
      hotspots.folders.map((folder) => [folder.path.toString(), folder]),
    );
    for await (const event of this.dependencies.scanner.scan(
      this.scanRequest(root, signal, alreadyScanned),
    )) {
      switch (event.kind) {
        case ScanEventKind.Progress:
          yield { kind: DiagnosisUpdateKind.Progress, progress: event };
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

  private scanRequest(
    root: AbsolutePath,
    signal: AbortSignal | undefined,
    alreadyScanned?: ReadonlyMap<string, DirectoryNode>,
  ): ScanRequest {
    const { ruleIndex, scanPolicy } = this.dependencies;
    return {
      root,
      markerFileNames: ruleIndex.markerFileNames,
      notableFileMinimumSize: scanPolicy.notableFileMinimumSize,
      ...(alreadyScanned === undefined ? {} : { alreadyScanned }),
      ...(signal === undefined ? {} : { signal }),
    };
  }

  private async scanHotspots(
    root: AbsolutePath,
    signal: AbortSignal | undefined,
  ): Promise<HotspotScan> {
    const paths = outermostOnly(
      this.dependencies.ruleIndex.hotspots
        .map((hotspot) => hotspot.path)
        .filter((path) => path.isSameOrInside(root)),
    );
    const folders: DirectoryNode[] = [];
    const issues: ScanIssue[] = [];
    for (const path of paths) {
      for await (const event of this.dependencies.scanner.scan(this.scanRequest(path, signal))) {
        if (event.kind !== ScanEventKind.Finished) continue;
        const hotspotMissing = event.snapshot.issues.some((issue) => issue.path.equals(path));
        if (hotspotMissing) continue;
        folders.push(event.snapshot.root);
        issues.push(...event.snapshot.issues);
      }
    }
    return { folders, issues };
  }

  private preliminaryFindings(
    root: AbsolutePath,
    folders: readonly DirectoryNode[],
  ): DiagnosisUpdate {
    const partialRoot = DirectoryNode.assemble({
      path: root,
      ownFilesSize: ByteSize.zero,
      ownFileCount: 0,
      lastModified: this.dependencies.clock.now(),
      notableFiles: [],
      markerFiles: new Set(),
      children: folders,
    });
    return {
      kind: DiagnosisUpdateKind.PreliminaryFindings,
      findings: this.report({
        root: partialRoot,
        issues: [],
        startedAt: partialRoot.lastModified,
        finishedAt: partialRoot.lastModified,
      }).findings,
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
