import { DiagnosisStage } from "../../../application/index.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatCount } from "../../format/count-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { formatPercent } from "../../format/percent-format.ts";
import { Glyph, Palette } from "../../theme.ts";
import { ScanStatus, type AppState } from "../state/app-state.ts";
import { shareBar, type Viewport } from "./layout.ts";

const DISK_BAR_WIDTH = 30;
const NEARLY_FULL_SHARE = 0.9;
const FILLING_UP_SHARE = 0.75;

export interface StatusRow {
  readonly label: string;
  readonly text: string;
  readonly color: string;
}

export interface DiskRow extends StatusRow {
  readonly bar: string;
}

export interface HeaderView {
  readonly appName: string;
  readonly location: string;
  readonly rule: string;
  readonly disk: DiskRow;
  readonly scan: StatusRow;
}

const diskColor = (shareUsed: number): string => {
  if (shareUsed >= NEARLY_FULL_SHARE) return Palette.keep;
  if (shareUsed >= FILLING_UP_SHARE) return Palette.caution;
  return Palette.safe;
};

function diskRow(state: AppState): DiskRow {
  const label = UiCopy.header.diskLabel;
  const { volume } = state;
  if (volume === undefined) {
    return { label, text: UiCopy.header.diskUnknown, color: Palette.muted, bar: "" };
  }
  const shareUsed = volume.used.shareOf(volume.capacity);
  return {
    label,
    bar: shareBar(shareUsed, DISK_BAR_WIDTH),
    color: diskColor(shareUsed),
    text: UiCopy.header.diskSummary(
      formatPercent(shareUsed),
      formatByteSize(volume.available),
      formatByteSize(volume.capacity),
    ),
  };
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
      const { root } = scan.report.snapshot;
      return UiCopy.scanning.done(formatByteSize(root.totalSize), formatCount(root.fileCount));
    }
    case ScanStatus.Failed:
      return UiCopy.scanning.failed(scan.reason);
  }
}

const scanColor: Readonly<Record<ScanStatus, string>> = {
  [ScanStatus.Running]: Palette.accent,
  [ScanStatus.Completed]: Palette.muted,
  [ScanStatus.Failed]: Palette.keep,
};

export function headerView(state: AppState, viewport: Viewport): HeaderView {
  return {
    appName: UiCopy.appName,
    location: UiCopy.scanRoot(formatPath(state.scope.root, state.context.home)),
    rule: Glyph.rule.repeat(Math.max(0, viewport.columns)),
    disk: diskRow(state),
    scan: {
      label: UiCopy.header.scanLabel,
      text: scanText(state),
      color: scanColor[state.scan.status],
    },
  };
}
