import type { ScreenKind } from "../state/screen.ts";
import { ColorRole, Glyph } from "../../theme.ts";
import { plain, type DetailLine, type DetailView } from "./detail-view.ts";
import { Layout, textWidth, truncate, type Viewport } from "./layout.ts";
import type { ListView } from "./list-row.ts";

/** What every tab fills in: a list, a few lines about the chosen row, and its detail pane. */
export interface BodyView extends ListView {
  readonly kind:
    | typeof ScreenKind.Diagnosis
    | typeof ScreenKind.Folders
    | typeof ScreenKind.DiskOverview
    | typeof ScreenKind.Growth;
  readonly emptyMessage: string | undefined;
  /** The chosen row in a few lines, shown under the list when the window is too narrow for a pane. */
  readonly strip: readonly DetailLine[];
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

/** Lines a list gives up besides its rows: the strip about the chosen row when there is no pane. */
export const bodyChromeLines = (hasPane: boolean): number => (hasPane ? 0 : Layout.stripLines);

/**
 * The chosen row in `Layout.stripLines` lines: its name and size, whether it is safe, and the first
 * thing to know before starting. Each is cut to fit so none wraps onto another line.
 */
export function stripOf(pane: DetailView | undefined, viewport: Viewport): readonly DetailLine[] {
  const width = textWidth(viewport, 1);
  if (pane === undefined) return [];
  const [check] = pane.checks;
  const [note] = pane.notes;
  const verdict = pane.verdict === "" ? pane.meta : pane.verdict;
  const lines: DetailLine[] = [
    plain(`${pane.title}${Glyph.separator}${pane.size}`),
    { text: `${pane.tone.icon} ${verdict}`, color: pane.tone.color },
    check === undefined
      ? (note ?? { text: pane.where, color: ColorRole.muted })
      : { text: `${check.mark} ${check.text}`, color: check.color },
  ];
  return lines.map((line) => ({ ...line, text: truncate(line.text, width) }));
}
