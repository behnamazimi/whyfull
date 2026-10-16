import { ScanScopeKind, type UsageBreakdown } from "../../../domain/index.ts";
import { AccessState } from "../../../application/index.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatCount } from "../../format/count-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { ColorRole } from "../../theme.ts";
import { ScanStatus, type AppState } from "../state/app-state.ts";
import { ScreenKind } from "../state/screen.ts";
import { shareColor, usageBreakdownOf } from "./disk-breakdown.ts";
import {
  Layout,
  padSize,
  sizeBar,
  textWidth,
  truncate,
  wrappedLineCount,
  type Viewport,
} from "./layout.ts";

const VOLUME_NAME_SEPARATOR = ", ";
const TITLE_LINES = 1;
const TITLE_GAP_LINES = 1;
const ROW_GAP_LINES = 1;
export const OVERVIEW_DETAIL_INDENT = 2;
const INLINE_DETAIL_GAP = 2;
const ROW_LEAD_WIDTH = Layout.sizeColumnWidth + 1 + Layout.barWidth + 1;

export const OverviewDensity = {
  Roomy: "roomy",
  Snug: "snug",
  Compact: "compact",
} as const;
export type OverviewDensity = (typeof OverviewDensity)[keyof typeof OverviewDensity];

export interface OverviewRow {
  readonly title: string;
  readonly detail: string;
  readonly size: string;
  readonly bar: string;
  readonly color: ColorRole;
}

export interface DiskOverviewView {
  readonly kind: typeof ScreenKind.DiskOverview;
  readonly title: string;
  readonly density: OverviewDensity;
  readonly rows: readonly OverviewRow[];
  readonly notes: readonly string[];
  readonly loadingMessage: string | undefined;
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

const bodyLines = (viewport: Viewport): number =>
  viewport.rows - Layout.headerLines - Layout.footerLines;

const linesNeeded = (
  density: OverviewDensity,
  rows: readonly OverviewRow[],
  notes: readonly string[],
  viewport: Viewport,
): number => {
  const noteLines = notes.reduce(
    (total, note) => total + wrappedLineCount(note, textWidth(viewport, 0)),
    0,
  );
  const detailLines = rows.reduce(
    (total, row) =>
      total + wrappedLineCount(row.detail, textWidth(viewport, OVERVIEW_DETAIL_INDENT)),
    0,
  );
  switch (density) {
    case OverviewDensity.Roomy:
      return (
        TITLE_LINES + TITLE_GAP_LINES + rows.length * (1 + ROW_GAP_LINES) + detailLines + noteLines
      );
    case OverviewDensity.Snug:
      return TITLE_LINES + TITLE_GAP_LINES + rows.length + detailLines + noteLines;
    case OverviewDensity.Compact:
      return TITLE_LINES + rows.length + noteLines;
  }
};

function densityFor(
  rows: readonly OverviewRow[],
  notes: readonly string[],
  viewport: Viewport,
): OverviewDensity {
  const available = bodyLines(viewport);
  const fitting = [OverviewDensity.Roomy, OverviewDensity.Snug].find(
    (density) => linesNeeded(density, rows, notes, viewport) <= available,
  );
  return fitting ?? OverviewDensity.Compact;
}

function inlineDetail(row: OverviewRow, viewport: Viewport): string {
  const width = textWidth(viewport, ROW_LEAD_WIDTH + row.title.length + INLINE_DETAIL_GAP);
  return width > Layout.minimumTextWidth ? truncate(row.detail, width) : "";
}

export function diskOverviewView(state: AppState, viewport: Viewport): DiskOverviewView {
  const base = { kind: ScreenKind.DiskOverview, title: UiCopy.overview.title } as const;
  const breakdown = usageBreakdownOf(state);
  if (breakdown === undefined) {
    return {
      ...base,
      density: OverviewDensity.Roomy,
      rows: [],
      notes: [],
      loadingMessage: UiCopy.overview.loading,
    };
  }
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
    color: ColorRole.safe,
  });
  const notes = notesFor(state, breakdown);
  const density = densityFor(rows, notes, viewport);
  return {
    ...base,
    density,
    rows:
      density === OverviewDensity.Compact
        ? rows.map((row) => ({ ...row, detail: inlineDetail(row, viewport) }))
        : rows,
    notes,
    loadingMessage: undefined,
  };
}
