import type { ByteSize } from "../../../domain/index.ts";
import { Glyph } from "../../theme.ts";

const ELLIPSIS = "…";
const HALVES = 2;

export const Layout = {
  headerLines: 4,
  footerLines: 2,
  screenTitleLines: 2,
  sizeColumnWidth: 8,
  barWidth: 12,
  minimumTextWidth: 10,
  horizontalPadding: 2,
} as const;

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

export function shareBar(share: number): string {
  const filled = Math.round(Math.min(Math.max(share, 0), 1) * Layout.barWidth);
  return Glyph.barFull.repeat(filled) + Glyph.barEmpty.repeat(Layout.barWidth - filled);
}

export const sizeBar = (size: ByteSize, largest: ByteSize): string =>
  shareBar(size.shareOf(largest));

export function truncate(text: string, width: number): string {
  if (text.length <= width) return text;
  return text.slice(0, Math.max(0, width - ELLIPSIS.length)) + ELLIPSIS;
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
      extraChromeLines) /
      linesPerRow,
  );

export const textWidth = (viewport: Viewport, reserved: number): number =>
  Math.max(Layout.minimumTextWidth, viewport.columns - Layout.horizontalPadding - reserved);
