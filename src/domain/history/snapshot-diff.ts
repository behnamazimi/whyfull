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
  readonly after: ByteSize;
  readonly growth: ByteSize;
}

export interface SnapshotDiff {
  readonly previousTakenAt: Date;
  readonly total: SizeChange;
  readonly grownFolders: readonly FolderGrowth[];
}

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
): SnapshotDiff {
  const previousSizes = new Map(
    previous.folders.map((folder) => [folder.path.toString(), folder.size]),
  );
  const growing = current.folders.flatMap((folder): FolderGrowth[] => {
    const before = previousSizes.get(folder.path.toString()) ?? ByteSize.zero;
    const growth = folder.size.minusOrZero(before);
    return growth.isAtLeast(policy.growthMinimumSize)
      ? [{ path: folder.path, before, after: folder.size, growth }]
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
  };
}
