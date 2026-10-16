import { ByteSize } from "../size/byte-size.ts";
import { CleanupActionKind, type ApprovedAction } from "./cleanup-plan.ts";

export const OutcomeKind = {
  Done: "done",
  Failed: "failed",
  SkippedBecauseChanged: "skipped-because-changed",
} as const;
export type OutcomeKind = (typeof OutcomeKind)[keyof typeof OutcomeKind];

export interface ActionResult {
  readonly action: ApprovedAction;
  readonly outcome: OutcomeKind;
  readonly detail: string | undefined;
}

export interface CleanupReport {
  readonly results: readonly ActionResult[];
  readonly removedSize: ByteSize;
  readonly movedToTrashSize: ByteSize;
  readonly measuredFreeSpaceGain: ByteSize | undefined;
}

export function summarizeCleanup(
  results: readonly ActionResult[],
  measuredFreeSpaceGain: ByteSize | undefined,
): CleanupReport {
  const done = results.filter((result) => result.outcome === OutcomeKind.Done);
  const sizeOf = (predicate: (result: ActionResult) => boolean): ByteSize =>
    ByteSize.sum(done.filter(predicate).map((result) => result.action.size));
  return {
    results,
    removedSize: sizeOf((result) => result.action.kind === CleanupActionKind.Delete),
    movedToTrashSize: sizeOf((result) => result.action.kind === CleanupActionKind.MoveToTrash),
    measuredFreeSpaceGain,
  };
}
