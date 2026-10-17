import type { ByteSize } from "../../../domain/index.ts";
import { Glyph, type ColorRole } from "../../theme.ts";

const ELLIPSIS = "…";
const HALVES = 2;

const POINTER_WIDTH = 1;
const CHECKBOX_WIDTH = 3;
const GAP_WIDTH = 1;
const ROW_END_PADDING = 1;
const SIZE_COLUMN_WIDTH = 8;
const BAR_WIDTH = 10;
const PROGRESS_BAR_WIDTH = 24;

export const Layout = {
  /** The "more above" and "more below" lines that frame a scrolling list. */
  listMarkerLines: 2,
  sizeColumnWidth: SIZE_COLUMN_WIDTH,
  barWidth: BAR_WIDTH,
  progressBarWidth: PROGRESS_BAR_WIDTH,
  minimumTextWidth: 10,
  horizontalPadding: 2,
  footerPadding: 2,
  /** The summary bar never grows past this, however wide the window. */
  summaryBarMaximumWidth: 120,
  tabGap: 1,
  /** Everything in a row except the size, bar and title: pointer, checkbox, gaps and the right edge. */
  rowChromeWidth:
    POINTER_WIDTH + CHECKBOX_WIDTH + GAP_WIDTH + GAP_WIDTH + GAP_WIDTH + ROW_END_PADDING,
  /** The icon and its gap, which push a row's title further right. */
  rowIconWidth: 2,
  filterChipLines: 1,
  splitPaneMinimumColumns: 110,
  detailPaneColumns: 52,
  /** The line above the review's items: what kinds there are and how much is freed. */
  reviewHeadLines: 1,
  reviewStatusLines: 1,
  reviewSpacerLines: 1,
  reviewIndentWidth: 6,
  dialogColumns: 64,
  /** The widest a dialog over the frame grows, however wide the window. */
  dialogMaximumColumns: 120,
  /** Rows left free above and below a dialog, both together. */
  dialogRowMargin: 0,
  /** The dialog's border and padding across, and its border and key row down. */
  dialogChromeColumns: 6,
  dialogChromeRows: 3,
  /** Columns left free around a dialog in a narrow window, both sides together. */
  dialogMargin: 4,
  /** Draws dialogs above every screen. */
  dialogLayer: 10,
} as const;

export const MinimumViewport = { columns: 80, rows: 18 } as const satisfies Viewport;

export interface Viewport {
  readonly columns: number;
  readonly rows: number;
}

export interface ListWindow {
  readonly start: number;
  readonly end: number;
}

export function visibleWindow(count: number, selected: number, capacity: number): ListWindow {
  const size = Math.max(1, capacity);
  const start = Math.max(0, Math.min(selected - Math.floor(size / HALVES), count - size));
  return { start, end: Math.min(count, start + size) };
}

export function shareBar(share: number, width: number = Layout.barWidth): string {
  const clamped = Math.min(Math.max(share, 0), 1);
  const filled = clamped > 0 ? Math.max(1, Math.round(clamped * width)) : 0;
  return Glyph.barFull.repeat(filled) + Glyph.barEmpty.repeat(width - filled);
}

export interface BarShare {
  readonly share: number;
  readonly color: ColorRole;
  /** Drawn instead of a full block, for space that is free or not looked at. */
  readonly glyph?: string;
}

export interface BarSegment {
  readonly text: string;
  readonly color: ColorRole;
}

/** Splits `width` cells between the shares; every non-empty share keeps at least one cell. */
export function stackedBar(shares: readonly BarShare[], width: number): BarSegment[] {
  const total = shares.reduce((sum, item) => sum + item.share, 0);
  if (total <= 0) return [];
  const cells = shares.map((item) =>
    item.share <= 0 ? 0 : Math.max(1, Math.round((item.share / total) * width)),
  );
  const largest = cells.indexOf(Math.max(...cells));
  cells[largest] = Math.max(1, (cells[largest] ?? 1) + width - cells.reduce((a, b) => a + b, 0));
  return shares
    .map((item, index) => ({
      text: (item.glyph ?? Glyph.barFull).repeat(cells[index] ?? 0),
      color: item.color,
    }))
    .filter((segment) => segment.text.length > 0);
}

export const sizeBar = (size: ByteSize, largest: ByteSize): string =>
  shareBar(size.shareOf(largest));

export function truncate(text: string, width: number): string {
  if (text.length <= width) return text;
  return text.slice(0, Math.max(0, width - ELLIPSIS.length)) + ELLIPSIS;
}

export function truncateMiddle(text: string, width: number): string {
  if (text.length <= width) return text;
  const kept = Math.max(0, width - ELLIPSIS.length);
  const tail = Math.floor(kept / HALVES);
  const head = kept - tail;
  return text.slice(0, head) + ELLIPSIS + text.slice(text.length - tail);
}

export const padSize = (text: string): string => text.padStart(Layout.sizeColumnWidth);

/** `viewport` is what the frame leaves for the screen's own content, not the whole window. */
export const listCapacity = (
  viewport: Viewport,
  extraChromeLines: number,
  linesPerRow: number,
): number => Math.floor((viewport.rows - Layout.listMarkerLines - extraChromeLines) / linesPerRow);

export const textWidth = (viewport: Viewport, reserved: number): number =>
  Math.max(Layout.minimumTextWidth, viewport.columns - Layout.horizontalPadding - reserved);

export const wrappedLineCount = (text: string, width: number): number =>
  Math.max(1, Math.ceil(text.length / Math.max(1, width)));

/** Keeps the end of a path, which names the folder, and cuts the start. */
export function truncateStart(text: string, width: number): string {
  if (text.length <= width) return text;
  return ELLIPSIS + text.slice(text.length - Math.max(0, width - ELLIPSIS.length));
}
