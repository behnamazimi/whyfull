import type {
  AbsolutePath,
  ActionResult,
  ApprovedAction,
  ItemIdentity,
  OwnerToolId,
  Result,
} from "../../domain/index.ts";

export interface CleanupFailure {
  readonly reason: string;
}

export interface FileInspector {
  identityOf(path: AbsolutePath): Promise<ItemIdentity | undefined>;
}

export interface TrashBin {
  moveToTrash(path: AbsolutePath): Promise<Result<void, CleanupFailure>>;
}

export interface FileRemover {
  removeRecursively(path: AbsolutePath): Promise<Result<void, CleanupFailure>>;
}

export interface AppActivity {
  runningAppNames(): Promise<ReadonlySet<string>>;
}

export interface OwnerTools {
  isAvailable(tool: OwnerToolId): boolean;
  run(tool: OwnerToolId): Promise<Result<void, CleanupFailure>>;
  describe(tool: OwnerToolId): string;
}

export type JournalEntryId = number;

export interface CleanupJournal {
  recordIntent(action: ApprovedAction): JournalEntryId;
  recordOutcome(entry: JournalEntryId, result: ActionResult): void;
}
