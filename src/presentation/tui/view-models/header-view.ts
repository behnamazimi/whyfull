import { DiagnosisStage } from "../../../application/index.ts";
import { ScanScopeKind, totalSizeOf } from "../../../domain/index.ts";
import { keyLabel, UserAction } from "../../keymap.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatCount } from "../../format/count-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { formatPercent } from "../../format/percent-format.ts";
import { ColorRole, Glyph } from "../../theme.ts";
import { ScanStatus, type AppState } from "../state/app-state.ts";
import { usageBreakdownOf, shareColor } from "./disk-breakdown.ts";
import { shareBar, stackedBar, type BarSegment, type Viewport } from "./layout.ts";

const DISK_BAR_WIDTH = 30;
const NEARLY_FULL_SHARE = 0.9;
const FILLING_UP_SHARE = 0.75;

export interface StatusRow {
  readonly label: string;
  readonly text: string;
  readonly color: ColorRole;
}

export interface DiskRow extends StatusRow {
  readonly segments: readonly BarSegment[];
}

export interface HeaderView {
  readonly appName: string;
  readonly location: string;
  readonly rule: string;
  readonly cleanup: string | undefined;
  readonly highRisk: string | undefined;
  readonly disk: DiskRow;
  readonly scan: StatusRow;
}

const diskColor = (shareUsed: number): ColorRole => {
  if (shareUsed >= NEARLY_FULL_SHARE) return ColorRole.keep;
  if (shareUsed >= FILLING_UP_SHARE) return ColorRole.caution;
  return ColorRole.safe;
};

function diskSegments(state: AppState, shareUsed: number): readonly BarSegment[] {
  const breakdown = usageBreakdownOf(state);
  if (breakdown === undefined) {
    return [{ text: shareBar(shareUsed, DISK_BAR_WIDTH), color: diskColor(shareUsed) }];
  }
  return stackedBar(
    [
      ...breakdown.shares.map((share) => ({
        share: share.size.shareOf(breakdown.capacity),
        color: shareColor[share.kind],
      })),
      { share: breakdown.free.shareOf(breakdown.capacity), color: ColorRole.safe },
    ],
    DISK_BAR_WIDTH,
  );
}

function diskRow(state: AppState): DiskRow {
  const label = UiCopy.header.diskLabel;
  const { volume } = state;
  if (volume === undefined) {
    return { label, text: UiCopy.header.diskUnknown, color: ColorRole.muted, segments: [] };
  }
  const shareUsed = volume.used.shareOf(volume.capacity);
  return {
    label,
    segments: diskSegments(state, shareUsed),
    color: diskColor(shareUsed),
    text: UiCopy.header.diskSummary(
      formatPercent(shareUsed),
      formatByteSize(volume.available),
      formatByteSize(volume.capacity),
    ),
  };
}

function scopeText(state: AppState, scanned: string): string {
  if (state.scope.kind === ScanScopeKind.WholeDisk)
    return UiCopy.scanning.scannedWholeDisk(scanned);
  const path = formatPath(state.scope.root, state.context.home);
  if (state.volume === undefined) return UiCopy.scanning.scannedFolderOnly(path, scanned);
  const summary = UiCopy.scanning.scannedFolder(
    path,
    scanned,
    formatByteSize(state.volume.capacity),
  );
  return state.context.wholeDiskScope === undefined
    ? summary
    : summary + UiCopy.scanning.lookAtWholeDisk(keyLabel[UserAction.ScanWholeDisk]);
}

function scanText(state: AppState): string {
  const { scan } = state;
  switch (scan.status) {
    case ScanStatus.Running:
      if (scan.stage === DiagnosisStage.KnownLocations) return UiCopy.scanning.knownLocations;
      return scan.progress === undefined
        ? UiCopy.scanning.starting
        : UiCopy.scanning.progress(
            formatCount(scan.progress.directoriesScanned),
            formatByteSize(scan.progress.sizeFound),
          );
    case ScanStatus.Completed: {
      return scopeText(state, formatByteSize(scan.report.snapshot.root.totalSize));
    }
    case ScanStatus.Failed:
      return UiCopy.scanning.failed(scan.reason);
  }
}

const scanColor: Readonly<Record<ScanStatus, ColorRole>> = {
  [ScanStatus.Running]: ColorRole.accent,
  [ScanStatus.Completed]: ColorRole.text,
  [ScanStatus.Failed]: ColorRole.keep,
};

export function headerView(state: AppState, viewport: Viewport): HeaderView {
  return {
    appName: UiCopy.appName,
    location: (state.scan.status === ScanStatus.Running ? UiCopy.scanRoot : UiCopy.scannedRoot)(
      formatPath(state.scope.root, state.context.home),
    ),
    rule: Glyph.rule.repeat(Math.max(0, viewport.columns)),
    cleanup:
      state.cart.size === 0
        ? undefined
        : UiCopy.header.cleanupSelected(formatByteSize(totalSizeOf([...state.cart.values()]))),
    highRisk: state.highRiskMode ? UiCopy.highRisk.badge : undefined,
    disk: diskRow(state),
    scan: {
      label: UiCopy.header.scanLabel,
      text: scanText(state),
      color: scanColor[state.scan.status],
    },
  };
}
