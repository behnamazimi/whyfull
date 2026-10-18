import {
  ByteSize,
  CartEntryKind,
  safeSizeInside,
  type AbsolutePath,
} from "../../../domain/index.ts";
import { isCleanableByWhyfull, ruleTag } from "../../copy/rule-labels.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { ColorRole, Glyph, safetyTone, SelectionState } from "../../theme.ts";
import { ScanStatus, type AppState } from "../state/app-state.ts";
import { highRiskBlockAt } from "../state/high-risk-reducer.ts";
import { ScreenKind } from "../state/screen.ts";
import { folderAt, folderEntries, FolderEntryKind, type FolderEntry } from "../state/selectors.ts";
import { bodyChromeLines, bodyLayout, stripOf, type BodyView } from "./body-view.ts";
import { folderPaneView } from "./folder-pane-view.ts";
import {
  chipCell,
  listCapacity,
  padSize,
  rowTitleWidth,
  sizeBar,
  truncate,
  visibleWindow,
  type Viewport,
} from "./layout.ts";
import { ListEntryKind, type ListRow } from "./list-row.ts";

export interface FoldersView extends BodyView {
  readonly kind: typeof ScreenKind.Folders;
}

interface RowContext {
  readonly selected: number;
  readonly largest: ByteSize;
  readonly titleWidth: number;
  readonly showsChip: boolean;
  readonly state: AppState;
}

/**
 * Folders whyfull can't tell apart from the rest can still be added, but only in high-risk mode,
 * and never where high-risk mode is blocked: a checkbox there would only lead to a refusal.
 */
function isSelectable(state: AppState, entry: FolderEntry): boolean {
  const { classification } = entry;
  return classification === undefined
    ? highRiskBlockAt(state, entry.path) === undefined
    : isCleanableByWhyfull(classification.rule);
}

/** A verdict for what whyfull recognizes, or how much is safe inside a folder it doesn't. */
function chipOf(state: AppState, entry: FolderEntry): { text: string; color: ColorRole } {
  const { classification } = entry;
  if (classification !== undefined) {
    const tone = safetyTone[classification.rule.safety];
    return { text: `${tone.icon} ${ruleTag(classification.rule)}`, color: tone.color };
  }
  const classifications =
    state.scan.status === ScanStatus.Completed
      ? state.scan.report.classification.classifications
      : [];
  const safe = safeSizeInside(classifications, entry.path);
  return safe.isZero()
    ? { text: "", color: ColorRole.muted }
    : { text: UiCopy.chips.safeInside(formatByteSize(safe)), color: ColorRole.muted };
}

function entryRow(entry: FolderEntry, index: number, context: RowContext): ListRow {
  const { state } = context;
  const risky = state.cart.get(entry.path.toString())?.kind === CartEntryKind.HighRisk;
  const glyph = entry.kind === FolderEntryKind.Folder ? Glyph.folder : Glyph.file;
  const tone =
    entry.classification === undefined ? undefined : safetyTone[entry.classification.rule.safety];
  const chip = chipOf(state, entry);
  return {
    kind: ListEntryKind.Row,
    index,
    selected: index === context.selected,
    selection: state.cart.has(entry.path.toString()) ? SelectionState.All : SelectionState.None,
    selectable: isSelectable(state, entry),
    icon: risky ? Glyph.warning : glyph,
    color: risky ? ColorRole.danger : (tone?.color ?? ColorRole.muted),
    barColor: tone?.color ?? ColorRole.tintMid,
    size: padSize(formatByteSize(entry.size)),
    bar: sizeBar(entry.size, context.largest),
    title: truncate(entry.path.name, context.titleWidth),
    chip: chipCell(chip.text, context.showsChip),
    chipColor: chip.color,
    opens: entry.kind === FolderEntryKind.Folder,
  };
}

export function foldersView(
  state: AppState,
  folderPath: AbsolutePath,
  selected: number,
  viewport: Viewport,
  now: Date,
): FoldersView {
  const layout = bodyLayout(viewport);
  const folder = folderAt(state, folderPath);
  const entries = folder === undefined ? [] : folderEntries(state, folder);
  const chosen = entries[selected];
  const pane = chosen === undefined ? undefined : folderPaneView(state, chosen, now);
  const window = visibleWindow(
    entries.length,
    selected,
    listCapacity(layout.list, bodyChromeLines(layout.pane !== undefined), 1),
  );
  const largest = entries[0]?.size ?? ByteSize.zero;
  const showsChip = layout.pane !== undefined;
  const titleWidth = rowTitleWidth(layout.list, showsChip);
  return {
    kind: ScreenKind.Folders,
    emptyMessage:
      entries.length === 0
        ? state.scan.status === ScanStatus.Completed
          ? UiCopy.tree.empty
          : UiCopy.notices.waitForScan
        : undefined,
    strip: layout.pane === undefined ? stripOf(pane, layout.list) : [],
    pane: layout.pane === undefined ? undefined : pane,
    entries: entries.slice(window.start, window.end).map((entry, offset) =>
      entryRow(entry, window.start + offset, {
        selected,
        largest,
        titleWidth,
        showsChip,
        state,
      }),
    ),
    hiddenAbove: window.start,
    hiddenBelow: entries.length - window.end,
  };
}
