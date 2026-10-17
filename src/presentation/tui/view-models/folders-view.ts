import {
  ByteSize,
  CartEntryKind,
  safeSizeInside,
  type AbsolutePath,
  type CartEntry,
  type Classification,
  type KnownFolder,
} from "../../../domain/index.ts";
import { folderCopy } from "../../copy/folder-copy.ts";
import { ruleCopy } from "../../copy/rule-copy.ts";
import { ruleTag } from "../../copy/rule-labels.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatAge } from "../../format/age-format.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { ColorRole, Glyph, safetyTone, SelectionState } from "../../theme.ts";
import type { AppState } from "../state/app-state.ts";
import { ScanStatus } from "../state/app-state.ts";
import { ScreenKind } from "../state/screen.ts";
import { folderAt, folderEntries, FolderEntryKind, type FolderEntry } from "../state/selectors.ts";
import {
  Layout,
  listCapacity,
  padSize,
  sizeBar,
  textWidth,
  truncate,
  truncateMiddle,
  visibleWindow,
  type Viewport,
} from "./layout.ts";
import { ListEntryKind, type ListRow, type ListView } from "./list-row.ts";

const ONE_LINE = 1;
const SUMMARY_LINES = 1;
const AGE_WIDTH = 16;
const TAG_WIDTH = 34;

export interface FoldersView extends ListView {
  readonly kind: typeof ScreenKind.Folders;
  readonly title: string;
  readonly size: string;
  readonly emptyMessage: string | undefined;
}

interface RowContext {
  readonly selected: number;
  readonly largest: ByteSize;
  readonly width: number;
  readonly now: Date;
  readonly showAge: boolean;
  readonly cart: ReadonlyMap<string, CartEntry>;
  readonly classifications: readonly Classification[];
  readonly knownFolders: readonly KnownFolder[];
}

function tagFor(entry: FolderEntry, context: RowContext): string {
  if (context.cart.get(entry.path.toString())?.kind === CartEntryKind.HighRisk) {
    return UiCopy.highRisk.browseTag;
  }
  if (entry.classification !== undefined) {
    const { rule } = entry.classification;
    return [ruleTag(rule), ruleCopy[rule.id].title].join(Glyph.separator);
  }
  if (entry.kind === FolderEntryKind.File) return UiCopy.tree.fileTag;
  const known = context.knownFolders.find((folder) => folder.path.equals(entry.path));
  if (known !== undefined) return folderCopy[known.id].label;
  const safe = safeSizeInside(context.classifications, entry.path);
  return safe.isZero() ? "" : UiCopy.tree.containsSafe(formatByteSize(safe));
}

function entryRow(entry: FolderEntry, index: number, context: RowContext): ListRow {
  const glyph = entry.kind === FolderEntryKind.Folder ? Glyph.folder : Glyph.file;
  const tone =
    entry.classification === undefined
      ? { color: ColorRole.muted, barColor: ColorRole.bar }
      : {
          color: safetyTone[entry.classification.rule.safety].color,
          barColor: safetyTone[entry.classification.rule.safety].color,
        };
  return {
    kind: ListEntryKind.Row,
    icon: glyph,
    index,
    selected: index === context.selected,
    selection: context.cart.has(entry.path.toString()) ? SelectionState.All : SelectionState.None,
    ...tone,
    size: padSize(formatByteSize(entry.size)),
    bar: sizeBar(entry.size, context.largest),
    title: truncate(entry.path.name, context.width),
    note: context.showAge ? formatAge(entry.lastModified, context.now) : "",
    tag: truncate(tagFor(entry, context), TAG_WIDTH),
  };
}

const PATH_SEPARATOR = "/";

/** `~/Library/Caches` becomes `~ › Library › Caches`; `/Volumes/Disk` keeps its leading slash. */
function breadcrumb(path: string): string {
  const parts = path.split(PATH_SEPARATOR).filter((part) => part !== "");
  return (path.startsWith(PATH_SEPARATOR) ? [PATH_SEPARATOR, ...parts] : parts).join(
    Glyph.breadcrumb,
  );
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
    listCapacity(viewport, SUMMARY_LINES, ONE_LINE),
  );
  const largest = entries[0]?.size ?? ByteSize.zero;
  const ages = new Set(entries.map((entry) => formatAge(entry.lastModified, now)));
  const showAge = ages.size > 1;
  const classifications =
    state.scan.status === ScanStatus.Completed
      ? state.scan.report.classification.classifications
      : [];
  const width = textWidth(
    viewport,
    Layout.sizeColumnWidth +
      Layout.barWidth +
      Layout.rowChromeWidth +
      Layout.rowIconWidth +
      AGE_WIDTH +
      TAG_WIDTH,
  );
  return {
    kind: ScreenKind.Folders,
    title: truncateMiddle(
      breadcrumb(formatPath(folderPath, state.context.home)),
      textWidth(viewport, Layout.sizeColumnWidth + Layout.barWidth),
    ),
    size: formatByteSize(folder?.totalSize ?? ByteSize.zero),
    emptyMessage: entries.length === 0 ? UiCopy.tree.empty : undefined,
    entries: entries.slice(window.start, window.end).map((entry, offset) =>
      entryRow(entry, window.start + offset, {
        selected,
        largest,
        width,
        now,
        showAge,
        cart: state.cart,
        classifications,
        knownFolders: state.context.knownFolders,
      }),
    ),
    hiddenAbove: window.start,
    hiddenBelow: entries.length - window.end,
  };
}
