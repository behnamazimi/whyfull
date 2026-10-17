import { OutcomeKind, type CleanupReport } from "../../domain/index.ts";
import { UiCopy } from "../copy/ui-copy.ts";
import { formatByteSize } from "../format/byte-size-format.ts";

/** Text a person can paste to share what a cleanup did. Undefined when it did nothing worth sharing. */
export function cleanupSummaryText(report: CleanupReport): string | undefined {
  const cleanedSomething = report.results.some(
    (result) => result.outcome === OutcomeKind.Done || result.outcome === OutcomeKind.PartlyDeleted,
  );
  if (!cleanedSomething) return undefined;
  const freed = report.measuredFreeSpaceGain ?? report.removedSize;
  const headline = !freed.isZero()
    ? UiCopy.cleanup.share.freed(formatByteSize(freed))
    : !report.movedToTrashSize.isZero()
      ? UiCopy.cleanup.share.trashed(formatByteSize(report.movedToTrashSize))
      : undefined;
  return headline === undefined ? undefined : [headline, UiCopy.cleanup.share.about].join("\n\n");
}
