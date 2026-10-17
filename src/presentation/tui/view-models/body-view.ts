import type { ScreenKind } from "../state/screen.ts";
import type { FindingFilter } from "../state/finding-filter.ts";
import type { DetailView } from "./detail-view.ts";
import { Layout, textWidth, truncate, type Viewport } from "./layout.ts";
import type { ListView } from "./list-row.ts";

export interface FilterChip {
  readonly label: string;
  readonly size: string;
  readonly active: boolean;
  /** Set when choosing the chip narrows the list. A lone chip that only names the list has none. */
  readonly filter: FindingFilter | undefined;
}

/** What every tab fills in: filter chips, a list, a line about the chosen row, and its detail pane. */
export interface BodyView extends ListView {
  readonly kind:
    | typeof ScreenKind.Diagnosis
    | typeof ScreenKind.Folders
    | typeof ScreenKind.DiskOverview
    | typeof ScreenKind.Growth;
  readonly chips: readonly FilterChip[];
  readonly emptyMessage: string | undefined;
  /** The chosen row in one line, shown under the list when the window is too narrow for a pane. */
  readonly caption: string | undefined;
  /** Set when the window is wide enough to show the chosen row beside the list. */
  readonly pane: DetailView | undefined;
}

export interface BodyLayout {
  readonly list: Viewport;
  /** Missing when the window is too narrow for a pane beside the list. */
  readonly pane: Viewport | undefined;
}

export function bodyLayout(viewport: Viewport): BodyLayout {
  if (viewport.columns < Layout.splitPaneMinimumColumns) return { list: viewport, pane: undefined };
  return {
    list: { ...viewport, columns: viewport.columns - Layout.detailPaneColumns },
    pane: { ...viewport, columns: Layout.detailPaneColumns - 1 },
  };
}

const CAPTION_LINES = 1;

/** Lines a list gives up besides its rows: the chips, and the caption when there is no pane. */
export const bodyChromeLines = (hasPane: boolean): number =>
  Layout.filterChipLines + (hasPane ? 0 : CAPTION_LINES);

/** The line under a list when there is no pane, cut to fit so it never wraps onto a second line. */
export const captionOf = (text: string | undefined, viewport: Viewport): string | undefined =>
  text === undefined ? undefined : truncate(text, textWidth(viewport, 1));
