import { CartEntryKind, ByteSize, RuleId, type RecognizedEntry } from "../../../domain/index.ts";
import { CleanupPhase, ScanStatus, type AppState } from "./app-state.ts";

/**
 * After items were moved to the Trash, emptying it is what gives the space back. This is that
 * step as a cart entry, or nothing when no item went to the Trash or the scan never saw the Trash.
 */
export function trashEntryAfterCleanup(state: AppState): RecognizedEntry | undefined {
  const { cleanup, scan } = state;
  if (cleanup.phase !== CleanupPhase.Finished || cleanup.report.movedToTrashSize.isZero()) {
    return undefined;
  }
  if (scan.status !== ScanStatus.Completed) return undefined;
  const trash = scan.report.classification.classifications.find(
    (item) => item.rule.id === RuleId.Trash,
  );
  if (trash === undefined) return undefined;
  return {
    kind: CartEntryKind.Recognized,
    path: trash.path,
    rule: trash.rule,
    size: ByteSize.sum([trash.size, cleanup.report.movedToTrashSize]),
  };
}
