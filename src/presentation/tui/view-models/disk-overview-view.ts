import { AccessState } from "../../../application/index.ts";
import {
  ScanScopeKind,
  UsageShareKind,
  type ByteSize,
  type UsageBreakdown,
  type UsageShare,
} from "../../../domain/index.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatPercent } from "../../format/percent-format.ts";
import { keyLabel, UserAction } from "../../keymap.ts";
import { ColorRole, Glyph, SelectionState, type Tone } from "../../theme.ts";
import { ScanStatus, type AppState } from "../state/app-state.ts";
import { ScreenKind } from "../state/screen.ts";
import { bodyChromeLines, bodyLayout, stripOf, type BodyView } from "./body-view.ts";
import { caution, type DetailAction, type DetailView } from "./detail-view.ts";
import { shareColor, shareGlyph, usageBreakdownOf } from "./disk-breakdown.ts";
import { scopeName } from "./scope-name.ts";
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

const VOLUME_NAME_SEPARATOR = ", ";

export interface DiskOverviewView extends BodyView {
  readonly kind: typeof ScreenKind.DiskOverview;
}

interface DiskRowData {
  readonly title: string;
  readonly detail: string;
  readonly size: ByteSize;
  readonly color: ColorRole;
  /** The texture this part is drawn in, in the bar above and as the row's icon. */
  readonly glyph: string;
  /** Missing for the free-space row. */
  readonly share: UsageShare | undefined;
}

function rowsOf(state: AppState, breakdown: UsageBreakdown): readonly DiskRowData[] {
  const context = {
    scannedFolder: scopeName(state),
    wholeDisk: state.scope.kind === ScanScopeKind.WholeDisk,
  };
  return [
    ...breakdown.shares.map((share) => ({
      ...UiCopy.overview.shares[share.kind]({
        ...context,
        volumeNames: share.volumeNames.join(VOLUME_NAME_SEPARATOR),
      }),
      size: share.size,
      color: shareColor[share.kind],
      glyph: shareGlyph[share.kind],
      share,
    })),
    {
      ...UiCopy.overview.free,
      size: breakdown.free,
      color: ColorRole.safe,
      glyph: Glyph.barFree,
      share: undefined,
    },
  ];
}

const hasUnreadFolders = (state: AppState, breakdown: UsageBreakdown): boolean =>
  breakdown.unreadableFolderCount > 0 && state.fullDiskAccess !== AccessState.Granted;

/**
 * Things worth knowing, said under the one row they are about: the running scan under the scanned
 * folder, and snapshots and unreadable folders under the space whyfull didn't look through.
 */
export function overviewNotes(
  state: AppState,
  breakdown: UsageBreakdown,
  kind: UsageShareKind,
): readonly string[] {
  switch (kind) {
    case UsageShareKind.ScannedFolder:
      return state.scan.status === ScanStatus.Running ? [UiCopy.overview.scanning] : [];
    case UsageShareKind.ElsewhereOnDataVolume:
      return [
        ...(breakdown.localSnapshotCount > 0
          ? [UiCopy.overview.snapshots(breakdown.localSnapshotCount)]
          : []),
        ...(hasUnreadFolders(state, breakdown) ? [UiCopy.overview.unreadable] : []),
      ];
    case UsageShareKind.OperatingSystem:
    case UsageShareKind.VirtualMemory:
    case UsageShareKind.OtherVolumes:
      return [];
  }
}

const neutral = (row: DiskRowData): Tone => ({ icon: row.glyph, color: row.color });

const action = (forAction: UserAction, label: string): DetailAction => ({
  key: keyLabel[forAction],
  label,
  action: forAction,
  active: false,
});

function actionsFor(
  state: AppState,
  breakdown: UsageBreakdown,
  share: UsageShare | undefined,
): readonly DetailAction[] {
  switch (share?.kind) {
    case UsageShareKind.ScannedFolder:
      return [action(UserAction.ShowCleanup, UiCopy.overview.seeItemByItem)];
    case UsageShareKind.ElsewhereOnDataVolume:
      return [
        ...(state.context.wholeDiskScope !== undefined &&
        state.scope.kind !== ScanScopeKind.WholeDisk
          ? [action(UserAction.ScanWholeDisk, UiCopy.actions[UserAction.ScanWholeDisk])]
          : []),
        ...(hasUnreadFolders(state, breakdown)
          ? [action(UserAction.FixPermissions, UiCopy.actions[UserAction.FixPermissions])]
          : []),
      ];
    case UsageShareKind.OperatingSystem:
    case UsageShareKind.VirtualMemory:
    case UsageShareKind.OtherVolumes:
    case undefined:
      return [];
  }
}

function paneFor(state: AppState, breakdown: UsageBreakdown, row: DiskRowData): DetailView {
  const notes = row.share === undefined ? [] : overviewNotes(state, breakdown, row.share.kind);
  return {
    title: row.title,
    size: formatByteSize(row.size),
    tone: neutral(row),
    verdict: "",
    meta: UiCopy.chips.shareOfDisk(formatPercent(row.size.shareOf(breakdown.capacity))),
    sections: [
      { label: UiCopy.detail.whatItIs, lines: [{ text: row.detail, color: ColorRole.text }] },
    ],
    checks: [],
    notes: notes.map(caution),
    where: "",
    actions: actionsFor(state, breakdown, row.share),
  };
}

function chipOf(
  state: AppState,
  breakdown: UsageBreakdown,
  row: DiskRowData,
): { text: string; color: ColorRole } {
  if (
    row.share?.kind === UsageShareKind.ElsewhereOnDataVolume &&
    hasUnreadFolders(state, breakdown)
  ) {
    return { text: UiCopy.chips.partUnread, color: ColorRole.caution };
  }
  return {
    text: UiCopy.chips.shareOfDisk(formatPercent(row.size.shareOf(breakdown.capacity))),
    color: ColorRole.muted,
  };
}

export function diskOverviewView(
  state: AppState,
  selected: number,
  viewport: Viewport,
): DiskOverviewView {
  const layout = bodyLayout(viewport);
  const breakdown = usageBreakdownOf(state);
  if (breakdown === undefined) {
    return {
      kind: ScreenKind.DiskOverview,
      emptyMessage: UiCopy.overview.loading,
      strip: [],
      pane: undefined,
      entries: [],
      hiddenAbove: 0,
      hiddenBelow: 0,
    };
  }
  const rows = rowsOf(state, breakdown);
  const window = visibleWindow(
    rows.length,
    selected,
    listCapacity(layout.list, bodyChromeLines(layout.pane !== undefined), 1),
  );
  const showsChip = layout.pane !== undefined;
  const titleWidth = rowTitleWidth(layout.list, showsChip);
  const chosen = rows[selected];
  const pane = chosen === undefined ? undefined : paneFor(state, breakdown, chosen);
  return {
    kind: ScreenKind.DiskOverview,
    emptyMessage: undefined,
    strip: layout.pane === undefined ? stripOf(pane, layout.list) : [],
    pane: layout.pane === undefined ? undefined : pane,
    entries: rows.slice(window.start, window.end).map((row, offset): ListRow => {
      const chip = chipOf(state, breakdown, row);
      return {
        kind: ListEntryKind.Row,
        index: window.start + offset,
        selected: window.start + offset === selected,
        selection: SelectionState.None,
        selectable: false,
        icon: row.glyph,
        color: row.color,
        barColor: row.color,
        size: padSize(formatByteSize(row.size)),
        bar: sizeBar(row.size, breakdown.capacity),
        title: truncate(row.title, titleWidth),
        chip: chipCell(chip.text, showsChip),
        chipColor: chip.color,
        opens: false,
      };
    }),
    hiddenAbove: window.start,
    hiddenBelow: rows.length - window.end,
  };
}
