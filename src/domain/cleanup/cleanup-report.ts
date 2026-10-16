import { ByteSize } from "../size/byte-size.ts";
import { CleanupActionKind, type ApprovedAction } from "./cleanup-plan.ts";

export const OutcomeKind = {
  Done: "done",
  PartlyDeleted: "partly-deleted",
  Failed: "failed",
  SkippedBecauseChanged: "skipped-because-changed",
  SkippedBecauseAppOpened: "skipped-because-app-opened",
} as const;
export type OutcomeKind = (typeof OutcomeKind)[keyof typeof OutcomeKind];

export interface ActionResult {
  readonly action: ApprovedAction;
  readonly outcome: OutcomeKind;
  readonly detail: string | undefined;
  /** How much the action removed. For an owner tool, the free space the disk gained while it ran. */
  readonly freed: ByteSize;
}

export interface CleanupReport {
  readonly results: readonly ActionResult[];
  readonly removedSize: ByteSize;
  readonly movedToTrashSize: ByteSize;
  readonly highRiskRemovedSize: ByteSize;
  readonly measuredFreeSpaceGain: ByteSize | undefined;
}

const DELETING_KINDS: ReadonlySet<CleanupActionKind> = new Set([
  CleanupActionKind.Delete,
  CleanupActionKind.DeleteHighRisk,
]);

export function summarizeCleanup(
  results: readonly ActionResult[],
  measuredFreeSpaceGain: ByteSize | undefined,
): CleanupReport {
  const freedBy = (predicate: (result: ActionResult) => boolean): ByteSize =>
    ByteSize.sum(results.filter(predicate).map((result) => result.freed));
  return {
    results,
    removedSize: freedBy((result) => DELETING_KINDS.has(result.action.kind)),
    movedToTrashSize: freedBy((result) => result.action.kind === CleanupActionKind.MoveToTrash),
    highRiskRemovedSize: freedBy(
      (result) => result.action.kind === CleanupActionKind.DeleteHighRisk,
    ),
    measuredFreeSpaceGain,
  };
}
