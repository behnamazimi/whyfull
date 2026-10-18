import type { AbsolutePath } from "../path/absolute-path.ts";
import type { HistoryPolicy } from "../policy/policy.ts";
import { ByteSize } from "../size/byte-size.ts";
import type { SnapshotSummary } from "./snapshot-summary.ts";

export const ChangeDirection = {
  Grew: "grew",
  Shrank: "shrank",
  Unchanged: "unchanged",
} as const;
export type ChangeDirection = (typeof ChangeDirection)[keyof typeof ChangeDirection];

export interface SizeChange {
  readonly direction: ChangeDirection;
  readonly amount: ByteSize;
}

export interface FolderGrowth {
  readonly path: AbsolutePath;
  readonly before: ByteSize;
  /** False when the folder was too small to be saved last time: `before` is then an upper bound. */
  readonly beforeKnown: boolean;
  readonly after: ByteSize;
  readonly growth: ByteSize;
}

export interface SnapshotDiff {
  readonly previousTakenAt: Date;
  readonly total: SizeChange;
  readonly grownFolders: readonly FolderGrowth[];
  /** Some folders couldn't be read this time, so part of a shrink may not be real. */
  readonly currentHasUnreadableFolders: boolean;
}

/** A shrink is suspect when the newer scan couldn't read some folders. */
export const shrinkMayBeUnreadable = (diff: SnapshotDiff): boolean =>
  diff.currentHasUnreadableFolders && diff.total.direction === ChangeDirection.Shrank;

export function sizeChange(before: ByteSize, after: ByteSize): SizeChange {
  if (after.isLargerThan(before)) {
    return { direction: ChangeDirection.Grew, amount: after.minusOrZero(before) };
  }
  if (before.isLargerThan(after)) {
    return { direction: ChangeDirection.Shrank, amount: before.minusOrZero(after) };
  }
  return { direction: ChangeDirection.Unchanged, amount: ByteSize.zero };
}

function explainedByDeeperFolder(
  candidate: FolderGrowth,
  others: readonly FolderGrowth[],
  policy: HistoryPolicy,
): boolean {
  return others.some(
    (other) =>
      other.path.isInside(candidate.path) &&
      other.growth.shareOf(candidate.growth) >= policy.shareExplainedByDeeperFolder,
  );
}

export function compareSnapshots(
  previous: SnapshotSummary,
  current: SnapshotSummary,
  policy: HistoryPolicy,
  currentHasUnreadableFolders = false,
): SnapshotDiff {
  const previousSizes = new Map(
    previous.folders.map((folder) => [folder.path.toString(), folder.size]),
  );
  const growing = current.folders.flatMap((folder): FolderGrowth[] => {
    const saved = previousSizes.get(folder.path.toString());
    // Only folders of at least the minimum size are saved, so a missing one was smaller than that.
    const before = saved ?? policy.folderMinimumSize;
    const growth = folder.size.minusOrZero(before);
    return growth.isAtLeast(policy.growthMinimumSize)
      ? [
          {
            path: folder.path,
            before,
            beforeKnown: saved !== undefined,
            after: folder.size,
            growth,
          },
        ]
      : [];
  });
  const grownFolders = growing
    .filter((candidate) => !explainedByDeeperFolder(candidate, growing, policy))
    .sort((left, right) => ByteSize.largestFirst(left.growth, right.growth))
    .slice(0, policy.grownFoldersShown);
  return {
    previousTakenAt: previous.takenAt,
    total: sizeChange(previous.totalSize, current.totalSize),
    grownFolders,
    currentHasUnreadableFolders,
  };
}
