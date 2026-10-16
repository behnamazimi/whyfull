import type { ByteSize } from "../../../domain/index.ts";
import { Glyph } from "../../theme.ts";

const ELLIPSIS = "…";
const HALVES = 2;

export const Layout = {
  headerLines: 5,
  footerLines: 2,
  screenTitleLines: 1,
  listMarkerLines: 2,
  sizeColumnWidth: 8,
  barWidth: 12,
  minimumTextWidth: 10,
  horizontalPadding: 2,
  footerPadding: 2,
  reviewStatusLines: 1,
  reviewSpacerLines: 1,
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
