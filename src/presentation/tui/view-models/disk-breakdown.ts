import {
  breakDownUsage,
  ByteSize,
  ScanIssueKind,
  ScanScopeKind,
  UsageShareKind,
  type UsageBreakdown,
} from "../../../domain/index.ts";
import { ColorRole } from "../../theme.ts";
import { ScanStatus, type AppState } from "../state/app-state.ts";

export const shareColor: Readonly<Record<UsageShareKind, ColorRole>> = {
  [UsageShareKind.ScannedFolder]: ColorRole.accent,
  [UsageShareKind.ElsewhereOnDataVolume]: ColorRole.caution,
  [UsageShareKind.OperatingSystem]: ColorRole.muted,
  [UsageShareKind.VirtualMemory]: ColorRole.muted,
  [UsageShareKind.OtherVolumes]: ColorRole.muted,
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
