import {
  breakDownUsage,
  ByteSize,
  ScanIssueKind,
  ScanScopeKind,
  UsageShareKind,
  type UsageBreakdown,
} from "../../../domain/index.ts";
import { AccessState } from "../../../application/index.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatCount } from "../../format/count-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { Palette } from "../../theme.ts";
import { ScanStatus, type AppState } from "../state/app-state.ts";
import { ScreenKind } from "../state/screen.ts";
import { padSize, sizeBar } from "./layout.ts";

const VOLUME_NAME_SEPARATOR = ", ";

export interface OverviewRow {
  readonly title: string;
  readonly detail: string;
  readonly size: string;
  readonly bar: string;
  readonly color: string;
}

export interface DiskOverviewView {
  readonly kind: typeof ScreenKind.DiskOverview;
  readonly title: string;
  readonly rows: readonly OverviewRow[];
  readonly notes: readonly string[];
  readonly loadingMessage: string | undefined;
}

const shareColor: Readonly<Record<UsageShareKind, string>> = {
  [UsageShareKind.ScannedFolder]: Palette.accent,
  [UsageShareKind.ElsewhereOnDataVolume]: Palette.caution,
  [UsageShareKind.OperatingSystem]: Palette.muted,
  [UsageShareKind.VirtualMemory]: Palette.muted,
  [UsageShareKind.OtherVolumes]: Palette.muted,
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

function notesFor(state: AppState, breakdown: UsageBreakdown): string[] {
  const notes: string[] = [];
  if (state.scan.status === ScanStatus.Running) notes.push(UiCopy.overview.scanning);
  if (breakdown.localSnapshotCount > 0) {
    notes.push(UiCopy.overview.snapshots(formatCount(breakdown.localSnapshotCount)));
  }
  if (breakdown.unreadableFolderCount > 0 && state.fullDiskAccess !== AccessState.Granted) {
    notes.push(UiCopy.overview.unreadable);
  }
  return notes;
}

export function diskOverviewView(state: AppState): DiskOverviewView {
  const base = { kind: ScreenKind.DiskOverview, title: UiCopy.overview.title } as const;
  if (state.storage === undefined) {
    return { ...base, rows: [], notes: [], loadingMessage: UiCopy.overview.loading };
  }
  const scanned = scannedSoFar(state);
  const breakdown = breakDownUsage({
    layout: state.storage,
    scannedSize: scanned.size,
    unreadableFolderCount: scanned.unreadable,
    scannedIncludesSystemVolume: state.scope.kind === ScanScopeKind.WholeDisk,
  });
  const rows: OverviewRow[] = breakdown.shares.map((share) => {
    const copy = UiCopy.overview.shares[share.kind]({
      scannedFolder: formatPath(state.scope.root, state.context.home),
      volumeNames: share.volumeNames.join(VOLUME_NAME_SEPARATOR),
      wholeDisk: state.scope.kind === ScanScopeKind.WholeDisk,
    });
    return {
      ...copy,
      size: padSize(formatByteSize(share.size)),
      bar: sizeBar(share.size, breakdown.capacity),
      color: shareColor[share.kind],
    };
  });
  rows.push({
    ...UiCopy.overview.free,
    size: padSize(formatByteSize(breakdown.free)),
    bar: sizeBar(breakdown.free, breakdown.capacity),
    color: Palette.safe,
  });
  return { ...base, rows, notes: notesFor(state, breakdown), loadingMessage: undefined };
}
