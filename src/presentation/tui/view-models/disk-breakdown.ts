import {
  breakDownUsage,
  ByteSize,
  ScanIssueKind,
  ScanScopeKind,
  UsageShareKind,
  type UsageBreakdown,
} from "../../../domain/index.ts";
import { ColorRole, Glyph } from "../../theme.ts";
import { ScanStatus, type AppState } from "../state/app-state.ts";

/** Neutral tints: the disk's parts have no safety verdict, and blue is kept for the cursor. */
export const shareColor: Readonly<Record<UsageShareKind, ColorRole>> = {
  [UsageShareKind.ScannedFolder]: ColorRole.tintStrong,
  [UsageShareKind.ElsewhereOnDataVolume]: ColorRole.tintMid,
  [UsageShareKind.OperatingSystem]: ColorRole.tintSoft,
  [UsageShareKind.VirtualMemory]: ColorRole.tintFaint,
  [UsageShareKind.OtherVolumes]: ColorRole.tintSoft,
};

/** Each part is drawn in its own texture, in the bar and again as the icon of its row. */
export const shareGlyph: Readonly<Record<UsageShareKind, string>> = {
  [UsageShareKind.ScannedFolder]: Glyph.barFull,
  [UsageShareKind.ElsewhereOnDataVolume]: Glyph.barDense,
  [UsageShareKind.OperatingSystem]: Glyph.hatch,
  [UsageShareKind.VirtualMemory]: Glyph.barEmpty,
  [UsageShareKind.OtherVolumes]: Glyph.hatch,
};

function scannedSoFar(state: AppState): { size: ByteSize; unreadable: number } {
  const { scan } = state;
  if (scan.status === ScanStatus.Completed) {
    const { snapshot } = scan.report;
    return {
      size: snapshot.root.totalSize,
      unreadable: snapshot.issues.filter((issue) => issue.kind === ScanIssueKind.PermissionDenied)
        .length,
    };
  }
  if (scan.status === ScanStatus.Running && scan.progress !== undefined) {
    return { size: scan.progress.sizeFound, unreadable: 0 };
  }
  return { size: ByteSize.zero, unreadable: 0 };
}

export function usageBreakdownOf(state: AppState): UsageBreakdown | undefined {
  if (state.storage === undefined) return undefined;
  const scanned = scannedSoFar(state);
  return breakDownUsage({
    layout: state.storage,
    scannedSize: scanned.size,
    unreadableFolderCount: scanned.unreadable,
    scannedIncludesSystemVolume: state.scope.kind === ScanScopeKind.WholeDisk,
  });
}
