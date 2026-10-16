import { ByteSize, type AbsolutePath } from "../../../domain/index.ts";
import { ruleCopy } from "../../copy/rule-copy.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatAge } from "../../format/age-format.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { Glyph, Palette, safetyTone } from "../../theme.ts";
import type { AppState } from "../state/app-state.ts";
import { ScreenKind } from "../state/screen.ts";
import { folderAt, folderEntries, FolderEntryKind, type FolderEntry } from "../state/selectors.ts";
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
import type { ListRow, ListView } from "./list-row.ts";

const LINES_PER_ROW = 1;
const SUMMARY_LINES = 1;
const AGE_WIDTH = 16;
const TAG_WIDTH = 34;

export interface FoldersView extends ListView {
  readonly kind: typeof ScreenKind.Folders;
  readonly title: string;
  readonly size: string;
  readonly emptyMessage: string | undefined;
}

function entryRow(
  entry: FolderEntry,
  index: number,
  context: { selected: number; largest: ByteSize; width: number; now: Date },
): ListRow {
  const glyph = entry.kind === FolderEntryKind.Folder ? Glyph.folder : Glyph.file;
  const tone =
    entry.classification === undefined
      ? { icon: glyph, color: Palette.muted }
      : safetyTone[entry.classification.rule.safety];
  const tag =
    entry.classification === undefined
      ? entry.kind === FolderEntryKind.File
        ? UiCopy.tree.fileTag
        : ""
      : ruleCopy[entry.classification.rule.id].title;
  return {
    index,
    selected: index === context.selected,
    ...tone,
    size: padSize(formatByteSize(entry.size)),
    bar: sizeBar(entry.size, context.largest),
    title: truncate(entry.path.name, context.width),
    detail: formatAge(entry.lastModified, context.now),
    tag: truncate(tag, TAG_WIDTH),
  };
}

export function foldersView(
  state: AppState,
  folderPath: AbsolutePath,
  selected: number,
  viewport: Viewport,
  now: Date,
): FoldersView {
  const folder = folderAt(state, folderPath);
  const entries = folder === undefined ? [] : folderEntries(state, folder);
  const window = visibleWindow(
    entries.length,
    selected,
    listCapacity(viewport, SUMMARY_LINES, LINES_PER_ROW),
  );
  const largest = entries[0]?.size ?? ByteSize.zero;
  const width = textWidth(
    viewport,
    Layout.sizeColumnWidth + Layout.barWidth + AGE_WIDTH + TAG_WIDTH,
  );
  return {
    kind: ScreenKind.Folders,
    title: formatPath(folderPath, state.context.home),
    size: formatByteSize(folder?.totalSize ?? ByteSize.zero),
    emptyMessage: entries.length === 0 ? UiCopy.tree.empty : undefined,
    compact: true,
    rows: entries
      .slice(window.start, window.end)
      .map((entry, offset) =>
        entryRow(entry, window.start + offset, { selected, largest, width, now }),
      ),
    hiddenAbove: window.start,
    hiddenBelow: entries.length - window.end,
  };
}
