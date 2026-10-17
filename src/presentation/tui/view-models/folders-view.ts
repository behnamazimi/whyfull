import {
  ByteSize,
  CartEntryKind,
  type AbsolutePath,
  type Classification,
} from "../../../domain/index.ts";
import { isCleanableByWhyfull } from "../../copy/rule-labels.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { ColorRole, Glyph, safetyTone, SelectionState } from "../../theme.ts";
import { ScanStatus, type AppState } from "../state/app-state.ts";
import { ScreenKind } from "../state/screen.ts";
import { folderAt, folderEntries, FolderEntryKind, type FolderEntry } from "../state/selectors.ts";
import { bodyChromeLines, bodyLayout, captionOf, type BodyView } from "./body-view.ts";
import { folderPaneView } from "./folder-pane-view.ts";
import {
  Layout,
  listCapacity,
  padSize,
  sizeBar,
  textWidth,
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
  readonly state: AppState;
}

/** Folders whyfull can't tell apart from the rest can still be added, but only in high-risk mode. */
function isSelectable(classification: Classification | undefined): boolean {
  return classification === undefined || isCleanableByWhyfull(classification.rule);
}

function entryRow(entry: FolderEntry, index: number, context: RowContext): ListRow {
  const { state } = context;
  const risky = state.cart.get(entry.path.toString())?.kind === CartEntryKind.HighRisk;
  const glyph = entry.kind === FolderEntryKind.Folder ? Glyph.folder : Glyph.file;
  const tone =
    entry.classification === undefined ? undefined : safetyTone[entry.classification.rule.safety];
  return {
    kind: ListEntryKind.Row,
    index,
    selected: index === context.selected,
    selection: state.cart.has(entry.path.toString()) ? SelectionState.All : SelectionState.None,
    selectable: isSelectable(entry.classification),
    icon: risky ? Glyph.warning : glyph,
    color: risky ? ColorRole.danger : (tone?.color ?? ColorRole.muted),
    barColor: tone?.color ?? ColorRole.tintMid,
    size: padSize(formatByteSize(entry.size)),
    bar: sizeBar(entry.size, context.largest),
    title: truncate(entry.path.name, context.titleWidth),
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
  const titleWidth = textWidth(
    layout.list,
    Layout.sizeColumnWidth + Layout.barWidth + Layout.rowChromeWidth + Layout.rowIconWidth,
  );
  return {
    kind: ScreenKind.Folders,
    chips: [
      {
        label: UiCopy.tabs.folders,
        size: formatByteSize(folder?.totalSize ?? ByteSize.zero),
        active: true,
        filter: undefined,
      },
    ],
    emptyMessage:
      entries.length === 0
        ? state.scan.status === ScanStatus.Completed
          ? UiCopy.tree.empty
          : UiCopy.notices.waitForScan
        : undefined,
    caption: layout.pane === undefined ? captionOf(pane?.verdict, layout.list) : undefined,
    pane: layout.pane === undefined ? undefined : pane,
    entries: entries
      .slice(window.start, window.end)
      .map((entry, offset) =>
        entryRow(entry, window.start + offset, { selected, largest, titleWidth, state }),
      ),
    hiddenAbove: window.start,
    hiddenBelow: entries.length - window.end,
  };
}
