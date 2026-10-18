import type {
  AppActivity,
  CleanupFailure,
  CleanupJournal,
  FileInspector,
  FileRemover,
  OwnerTools,
  SizeMeter,
  ToolFailure,
  TrashBin,
  VolumeInfoProvider,
} from "../../src/application/index.ts";
import {
  ByteSize,
  failure,
  ProbeProblem,
  success,
  toolNotReady,
  toolReady,
  type AbsolutePath,
  type ActionResult,
  type ApprovedAction,
  type ItemIdentity,
  type OwnerToolId,
  type Result,
  type ToolProblem,
  type ToolReadiness,
} from "../../src/domain/index.ts";

// Far from the inodes test builders hand out, so a replaced item never matches its scan.
const FAKE_FILE_SYSTEM_FIRST_INODE = 1_000_000;

export class FakeFileSystem implements FileInspector, FileRemover, TrashBin, SizeMeter {
  readonly removed: string[] = [];
  readonly trashed: string[] = [];
  trashEmptied = 0;
  private readonly identities = new Map<string, ItemIdentity>();
  private readonly sizes = new Map<string, ByteSize>();
  private readonly leftAfterFailure = new Map<string, ByteSize>();
  private nextInode = FAKE_FILE_SYSTEM_FIRST_INODE;

  add(path: AbsolutePath, isSymbolicLink = false): void {
    this.identities.set(path.toString(), { device: 1, inode: this.nextInode++, isSymbolicLink });
  }

  /** Registers an item with the identity the scan recorded for it. */
  addScanned(path: AbsolutePath, identity: ItemIdentity, size: ByteSize): void {
    this.identities.set(path.toString(), identity);
    this.sizes.set(path.toString(), size);
  }

  resize(path: AbsolutePath, size: ByteSize): void {
    this.sizes.set(path.toString(), size);
  }

  /** Makes removal fail partway, leaving this much behind. */
  failRemoval(path: AbsolutePath, left: ByteSize): void {
    this.leftAfterFailure.set(path.toString(), left);
  }

  replace(path: AbsolutePath): void {
    this.add(path);
  }

  identityOf(path: AbsolutePath): Promise<ItemIdentity | undefined> {
    return Promise.resolve(this.identities.get(path.toString()));
  }

  removeRecursively(path: AbsolutePath): Promise<Result<void, CleanupFailure>> {
    const left = this.leftAfterFailure.get(path.toString());
    if (left !== undefined) {
      this.sizes.set(path.toString(), left);
      return Promise.resolve(failure({ reason: "a file is locked" }));
    }
    this.removed.push(path.toString());
    this.identities.delete(path.toString());
    return Promise.resolve(success(undefined));
  }

  allocatedSizeOf(path: AbsolutePath): Promise<Result<ByteSize, CleanupFailure>> {
    return Promise.resolve(success(this.sizes.get(path.toString()) ?? ByteSize.zero));
  }

  moveToTrash(path: AbsolutePath): Promise<Result<void, CleanupFailure>> {
    this.trashed.push(path.toString());
    return Promise.resolve(success(undefined));
  }

  empty(): Promise<Result<void, CleanupFailure>> {
    this.trashEmptied += 1;
    return Promise.resolve(success(undefined));
  }
}

export class FakeOwnerTools implements OwnerTools {
  readonly ran: OwnerToolId[] = [];
  private readonly problems = new Map<OwnerToolId, ProbeProblem>();
  private readonly runFailures = new Map<OwnerToolId, ToolProblem>();

  /** Tools in `installed` are ready; any other tool is not installed. */
  constructor(private readonly installed: ReadonlySet<OwnerToolId>) {}

  /** Makes the check fail, as if the tool broke after the plan was made. */
  becomeUnready(tool: OwnerToolId, problem: ProbeProblem): void {
    this.problems.set(tool, problem);
  }

  failRun(tool: OwnerToolId, problem: ToolProblem): void {
    this.runFailures.set(tool, problem);
  }

  check(tool: OwnerToolId): Promise<ToolReadiness> {
    const problem = this.problems.get(tool);
    if (problem !== undefined) return Promise.resolve(toolNotReady(problem));
    return Promise.resolve(
      this.installed.has(tool) ? toolReady : toolNotReady(ProbeProblem.NotInstalled),
    );
  }

  describe(tool: OwnerToolId): string {
    return tool;
  }

  run(tool: OwnerToolId): Promise<Result<void, ToolFailure>> {
    this.ran.push(tool);
    const problem = this.runFailures.get(tool);
    return Promise.resolve(
      problem === undefined ? success(undefined) : failure({ reason: "tool output", problem }),
    );
  }
}

export const appsRunning = (...names: string[]): AppActivity => ({
  runningAppNames: () => Promise.resolve(new Set(names)),
});

export class MemoryJournal implements CleanupJournal {
  readonly intents: ApprovedAction[] = [];
  readonly outcomes: ActionResult[] = [];
  readonly highRiskModeChanges: boolean[] = [];

  recordHighRiskMode(turnedOn: boolean): void {
    this.highRiskModeChanges.push(turnedOn);
  }

  recordIntent(action: ApprovedAction): number {
    this.intents.push(action);
    return this.intents.length;
  }

  recordOutcome(_entry: number, result: ActionResult): void {
    this.outcomes.push(result);
  }
}

export function volumeWithAvailable(...readings: ByteSize[]): VolumeInfoProvider {
  const remaining = [...readings];
  return {
    usageOf: () => {
      const available = remaining.shift() ?? ByteSize.zero;
      return Promise.resolve(success({ capacity: available, used: ByteSize.zero, available }));
    },
  };
}
