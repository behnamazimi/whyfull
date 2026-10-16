import { DiagnosisStage } from "../../../application/index.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatCount } from "../../format/count-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { formatPercent } from "../../format/percent-format.ts";
import { ScanStatus, type AppState } from "../state/app-state.ts";

export interface HeaderView {
  readonly appName: string;
  readonly diskLine: string;
  readonly diskShareUsed: number | undefined;
  readonly scanLine: string;
  readonly scanRunning: boolean;
}

function scanLine(state: AppState): string {
  const { scan, context } = state;
  switch (scan.status) {
    case ScanStatus.Running:
      if (scan.stage === DiagnosisStage.KnownLocations) return UiCopy.scanning.knownLocations;
      return scan.progress === undefined
        ? UiCopy.scanning.title
        : `${UiCopy.scanning.title} ${UiCopy.scanning.progress(
            formatCount(scan.progress.directoriesScanned),
            formatByteSize(scan.progress.sizeFound),
          )}`;
    case ScanStatus.Completed:
      return UiCopy.scanRoot(formatPath(state.scope.root, context.home));
    case ScanStatus.Failed:
      return UiCopy.scanning.failed(scan.reason);
  }
}

export function headerView(state: AppState): HeaderView {
  const { volume } = state;
  const diskShareUsed = volume?.used.shareOf(volume.capacity);
  return {
    appName: UiCopy.appName,
    diskLine:
      volume === undefined || diskShareUsed === undefined
        ? UiCopy.diskUsageUnknown
        : `${UiCopy.diskLabel}: ${UiCopy.diskUsage(
            formatByteSize(volume.used),
            formatByteSize(volume.capacity),
            formatPercent(diskShareUsed),
          )}`,
    diskShareUsed,
    scanLine: scanLine(state),
    scanRunning: state.scan.status === ScanStatus.Running,
  };
}
