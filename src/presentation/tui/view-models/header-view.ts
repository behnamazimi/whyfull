import { DiagnosisStage } from "../../../application/index.ts";
import { ScanScopeKind, totalSizeOf } from "../../../domain/index.ts";
import { keyLabel, UserAction } from "../../keymap.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { formatPercent } from "../../format/percent-format.ts";
import { ColorRole, Glyph } from "../../theme.ts";
import { ScanStatus, type AppState, type ScanState } from "../state/app-state.ts";
import { usageBreakdownOf, shareColor } from "./disk-breakdown.ts";
import { Layout, shareBar, stackedBar, type BarSegment, type Viewport } from "./layout.ts";

const DISK_BAR_WIDTH = 30;
const NEARLY_FULL_SHARE = 0.9;
const FILLING_UP_SHARE = 0.75;
const SPINNER_FRAME_MILLISECONDS = 100;
/** A folder scan can't know its total, so the bar never claims to be finished. */
const MOST_OF_THE_WAY = 0.99;

type RunningScan = Extract<ScanState, { readonly status: typeof ScanStatus.Running }>;

export interface StatusRow {
  readonly label: string;
  readonly text: string;
  readonly color: ColorRole;
}

export interface BarRow extends StatusRow {
  /** Drawn before the text: the spinner and the progress bar. */
  readonly segments: readonly BarSegment[];
}

export type DiskRow = BarRow;

export interface HeaderView {
  readonly appName: string;
  readonly location: string;
  readonly rule: string;
  readonly cleanup: string | undefined;
  readonly highRisk: string | undefined;
  readonly disk: DiskRow;
  readonly scan: BarRow;
}

const diskColor = (shareUsed: number): ColorRole => {
  if (shareUsed >= NEARLY_FULL_SHARE) return ColorRole.danger;
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

function runningRow(state: AppState, scan: RunningScan, now: Date): BarRow {
  const frame = Math.floor(now.getTime() / SPINNER_FRAME_MILLISECONDS) % Glyph.spinner.length;
  const spinner: BarSegment = {
    text: `${Glyph.spinner[frame] ?? Glyph.working} `,
    color: ColorRole.accent,
  };
  const label = UiCopy.header.scanLabel;
  const color = ColorRole.accent;
  const { progress } = scan;
  if (scan.stage === DiagnosisStage.KnownLocations) {
    return { label, color, segments: [spinner], text: UiCopy.scanning.knownLocations };
  }
  if (progress === undefined) {
    return { label, color, segments: [spinner], text: UiCopy.scanning.starting };
  }
  const { volume } = state;
  if (volume === undefined) {
    return {
      label,
      color,
      segments: [spinner],
      text: UiCopy.scanning.progress(
        progress.directoriesScanned,
        formatByteSize(progress.sizeFound),
      ),
    };
  }
  // Without a known total, the disk's used space is the best guess at how much there is to find.
  const share = Math.min(progress.sizeFound.shareOf(volume.used), MOST_OF_THE_WAY);
  const filled = Math.round(share * Layout.progressBarWidth);
  return {
    label,
    color: ColorRole.text,
    segments: [
      spinner,
      { text: Glyph.barFull.repeat(filled), color: ColorRole.accent },
      { text: Glyph.barEmpty.repeat(Layout.progressBarWidth - filled), color: ColorRole.barTrack },
    ],
    text: ` ${UiCopy.scanning.checkedSoFar(formatPercent(share), formatByteSize(progress.sizeFound))}`,
  };
}

function scanRow(state: AppState, now: Date): BarRow {
  const { scan } = state;
  const label = UiCopy.header.scanLabel;
  switch (scan.status) {
    case ScanStatus.Running:
      return runningRow(state, scan, now);
    case ScanStatus.Completed:
      return {
        label,
        segments: [],
        color: ColorRole.text,
        text: `${Glyph.done} ${scopeText(state, formatByteSize(scan.report.snapshot.root.totalSize))}`,
      };
    case ScanStatus.Failed:
      return {
        label,
        segments: [],
        color: ColorRole.danger,
        text: UiCopy.scanning.failed(scan.reason),
      };
  }
}

export function headerView(state: AppState, viewport: Viewport, now: Date): HeaderView {
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
    scan: scanRow(state, now),
  };
}
