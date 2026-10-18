import type {
  AbsolutePath,
  ActionResult,
  ApprovedAction,
  ByteSize,
  ItemIdentity,
  OwnerToolId,
  Result,
  ToolProblem,
  ToolReadiness,
} from "../../domain/index.ts";

export interface CleanupFailure {
  readonly reason: string;
}

export interface FileInspector {
  identityOf(path: AbsolutePath): Promise<ItemIdentity | undefined>;
}

export interface TrashBin {
  moveToTrash(path: AbsolutePath): Promise<Result<void, CleanupFailure>>;
  /** Empties the whole Trash, the way the system does, including items that are locked. */
  empty(): Promise<Result<void, CleanupFailure>>;
}

export interface FileRemover {
  removeRecursively(path: AbsolutePath): Promise<Result<void, CleanupFailure>>;
}

/** Measures allocated size the way a scan does: hard links once, symlinks not followed. */
export interface SizeMeter {
  allocatedSizeOf(path: AbsolutePath): Promise<Result<ByteSize, CleanupFailure>>;
}

export interface AppActivity {
  runningAppNames(): Promise<ReadonlySet<string>>;
}

export interface ToolFailure extends CleanupFailure {
  readonly problem: ToolProblem;
}

export interface OwnerTools {
  /** Whether the tool can run right now, not only whether it is installed. */
  check(tool: OwnerToolId): Promise<ToolReadiness>;
  run(tool: OwnerToolId): Promise<Result<void, ToolFailure>>;
  describe(tool: OwnerToolId): string;
}

export type JournalEntryId = number;

export interface CleanupJournal {
  recordIntent(action: ApprovedAction): JournalEntryId;
  recordOutcome(entry: JournalEntryId, result: ActionResult): void;
  recordHighRiskMode(turnedOn: boolean): void;
}
