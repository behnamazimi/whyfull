import type {
  AppActivity,
  CleanupFailure,
  CleanupJournal,
  FileInspector,
  FileRemover,
  OwnerTools,
  TrashBin,
  VolumeInfoProvider,
} from "../../src/application/index.ts";
import {
  ByteSize,
  success,
  type AbsolutePath,
  type ActionResult,
  type ApprovedAction,
  type ItemIdentity,
  type OwnerToolId,
  type Result,
} from "../../src/domain/index.ts";

export class FakeFileSystem implements FileInspector, FileRemover, TrashBin {
  readonly removed: string[] = [];
  readonly trashed: string[] = [];
  private readonly identities = new Map<string, ItemIdentity>();
  private nextInode = 1;

  add(path: AbsolutePath, isSymbolicLink = false): void {
    this.identities.set(path.toString(), { device: 1, inode: this.nextInode++, isSymbolicLink });
  }

  replace(path: AbsolutePath): void {
    this.add(path);
  }

  identityOf(path: AbsolutePath): Promise<ItemIdentity | undefined> {
    return Promise.resolve(this.identities.get(path.toString()));
  }

  removeRecursively(path: AbsolutePath): Promise<Result<void, CleanupFailure>> {
    this.removed.push(path.toString());
    return Promise.resolve(success(undefined));
  }

  moveToTrash(path: AbsolutePath): Promise<Result<void, CleanupFailure>> {
    this.trashed.push(path.toString());
    return Promise.resolve(success(undefined));
  }
}

export class FakeOwnerTools implements OwnerTools {
  readonly ran: OwnerToolId[] = [];
  constructor(private readonly installed: ReadonlySet<OwnerToolId>) {}

  isAvailable(tool: OwnerToolId): boolean {
    return this.installed.has(tool);
  }

  describe(tool: OwnerToolId): string {
    return tool;
  }

  run(tool: OwnerToolId): Promise<Result<void, CleanupFailure>> {
    this.ran.push(tool);
    return Promise.resolve(success(undefined));
  }
}

export const appsRunning = (...names: string[]): AppActivity => ({
  runningAppNames: () => Promise.resolve(new Set(names)),
});

export class MemoryJournal implements CleanupJournal {
  readonly intents: ApprovedAction[] = [];
  readonly outcomes: ActionResult[] = [];

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
