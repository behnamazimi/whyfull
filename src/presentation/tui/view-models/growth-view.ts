import {
  ByteSize,
  ChangeDirection,
  type FolderGrowth,
  type SnapshotDiff,
} from "../../../domain/index.ts";
import { formatAge } from "../../format/age-format.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { keyLabel, UserAction } from "../../keymap.ts";
import { ColorRole, Glyph, SelectionState } from "../../theme.ts";
import type { AppState } from "../state/app-state.ts";
import { ScreenKind } from "../state/screen.ts";
import { folderAt } from "../state/selectors.ts";
import { bodyChromeLines, bodyLayout, captionOf, type BodyView } from "./body-view.ts";
import { plain, type DetailView } from "./detail-view.ts";
import {
  Layout,
  listCapacity,
  padSize,
  sizeBar,
  textWidth,
  truncateStart,
  visibleWindow,
  type Viewport,
} from "./layout.ts";
import { ListEntryKind, type ListRow } from "./list-row.ts";

export interface GrowthView extends BodyView {
  readonly kind: typeof ScreenKind.Growth;
}

export function growthLine(diff: SnapshotDiff, now: Date): string {
  const change = UiCopy.growth.changes[diff.total.direction](formatByteSize(diff.total.amount));
  return UiCopy.growth.sinceLastScan(formatAge(diff.previousTakenAt, now), change);
}

const grewBy = (size: ByteSize): string =>
  UiCopy.growth.changes[ChangeDirection.Grew](formatByteSize(size));

function paneFor(state: AppState, folder: FolderGrowth): DetailView {
  const inScan = folderAt(state, folder.path) !== undefined;
  return {
    title: folder.path.name,
    size: grewBy(folder.growth),
    tone: { icon: Glyph.folder, color: ColorRole.caution },
    verdict: UiCopy.growth.grewVerdict,
    meta: "",
    sections: [
      {
        label: UiCopy.growth.whatChanged,
        lines: [
          plain(UiCopy.growth.fromTo(formatByteSize(folder.before), formatByteSize(folder.after))),
        ],
      },
    ],
    notes: [],
    where: formatPath(folder.path, state.context.home),
    actions: inScan
      ? [
          {
            key: keyLabel[UserAction.Open],
            label: UiCopy.detail.lookInside,
            action: UserAction.Open,
            active: false,
          },
        ]
      : [],
  };
}

export function growthView(state: AppState, selected: number, viewport: Viewport): GrowthView {
  const layout = bodyLayout(viewport);
  const { growth } = state;
  const folders = growth?.grownFolders ?? [];
  const window = visibleWindow(
    folders.length,
    selected,
    listCapacity(layout.list, bodyChromeLines(layout.pane !== undefined), 1),
  );
  const largest = folders[0]?.growth ?? ByteSize.zero;
  const titleWidth = textWidth(
    layout.list,
    Layout.sizeColumnWidth + Layout.barWidth + Layout.rowChromeWidth + Layout.rowIconWidth,
  );
  const chosen = folders[selected];
  const emptyMessage =
    growth === undefined
      ? UiCopy.growth.firstScan
      : folders.length === 0
        ? UiCopy.growth.noneGrew(formatByteSize(state.context.historyPolicy.growthMinimumSize))
        : undefined;
  return {
    kind: ScreenKind.Growth,
    filterHint: undefined,
    chips: [
      {
        label: UiCopy.tabs.grew,
        size: growth === undefined ? "" : grewBy(growth.total.amount),
        active: true,
        filter: undefined,
      },
    ],
    emptyMessage,
    caption:
      layout.pane === undefined && chosen !== undefined
        ? captionOf(UiCopy.growth.was(formatByteSize(chosen.before)), layout.list)
        : undefined,
    pane: layout.pane === undefined || chosen === undefined ? undefined : paneFor(state, chosen),
    entries: folders.slice(window.start, window.end).map((folder, offset): ListRow => ({
      kind: ListEntryKind.Row,
      index: window.start + offset,
      selected: window.start + offset === selected,
      selection: SelectionState.None,
      selectable: false,
      icon: Glyph.folder,
      color: ColorRole.caution,
      barColor: ColorRole.caution,
      size: padSize(grewBy(folder.growth)),
      bar: sizeBar(folder.growth, largest),
      title: truncateStart(formatPath(folder.path, state.context.home), titleWidth),
    })),
    hiddenAbove: window.start,
    hiddenBelow: folders.length - window.end,
  };
}
