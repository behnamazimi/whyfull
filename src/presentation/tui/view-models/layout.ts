import type { ByteSize } from "../../../domain/index.ts";
import { Glyph, type ColorRole } from "../../theme.ts";

const ELLIPSIS = "…";
const HALVES = 2;

export const Layout = {
  headerLines: 5,
  /** The notice line and the first row of key hints. */
  footerLines: 2,
  footerHintRowsMost: 2,
  screenTitleLines: 1,
  listMarkerLines: 2,
  sizeColumnWidth: 8,
  barWidth: 12,
  minimumTextWidth: 10,
  horizontalPadding: 2,
  footerPadding: 2,
  rowChromeWidth: 8,
  splitPaneMinimumColumns: 110,
  detailPaneColumns: 52,
  reviewStatusLines: 1,
  reviewSpacerLines: 1,
  reviewIndentWidth: 6,
  dialogColumns: 64,
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
  const filled = Math.round(Math.min(Math.max(share, 0), 1) * width);
  return Glyph.barFull.repeat(filled) + Glyph.barEmpty.repeat(width - filled);
}

export interface BarShare {
  readonly share: number;
  readonly color: ColorRole;
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
    .map((item, index) => ({ text: Glyph.barFull.repeat(cells[index] ?? 0), color: item.color }))
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

export const listCapacity = (
  viewport: Viewport,
  extraChromeLines: number,
  linesPerRow: number,
): number =>
  Math.floor(
    (viewport.rows -
      Layout.headerLines -
      Layout.footerLines -
      Layout.screenTitleLines -
      Layout.listMarkerLines -
      extraChromeLines) /
      linesPerRow,
  );

export const textWidth = (viewport: Viewport, reserved: number): number =>
  Math.max(Layout.minimumTextWidth, viewport.columns - Layout.horizontalPadding - reserved);

export const wrappedLineCount = (text: string, width: number): number =>
  Math.max(1, Math.ceil(text.length / Math.max(1, width)));
