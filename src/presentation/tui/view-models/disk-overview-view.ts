import { AccessState } from "../../../application/index.ts";
import type { ByteSize } from "../../../domain/index.ts";
import { ScanScopeKind, type UsageBreakdown, type UsageShare } from "../../../domain/index.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { keyLabel, UserAction } from "../../keymap.ts";
import { ColorRole, Glyph, type Tone } from "../../theme.ts";
import { ScanStatus, type AppState } from "../state/app-state.ts";
import { ScreenKind } from "../state/screen.ts";
import { bodyChromeLines, bodyLayout, captionOf, type BodyView } from "./body-view.ts";
import { caution, type DetailAction, type DetailView } from "./detail-view.ts";
import { shareColor, usageBreakdownOf } from "./disk-breakdown.ts";
import { scopeName } from "./scope-name.ts";
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
import { SelectionState } from "../../theme.ts";

const VOLUME_NAME_SEPARATOR = ", ";

export interface DiskOverviewView extends BodyView {
  readonly kind: typeof ScreenKind.DiskOverview;
}

interface DiskRowData {
  readonly title: string;
  readonly detail: string;
  readonly size: ByteSize;
  readonly color: ColorRole;
  /** Only the row for space outside the scanned folder can say why it wasn't looked through. */
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
      share,
    })),
    {
      ...UiCopy.overview.free,
      size: breakdown.free,
      color: ColorRole.safe,
      share: undefined,
    },
  ];
}

/** Things worth knowing about the whole disk, which the frame shows under the row they belong to. */
export function overviewNotes(state: AppState, breakdown: UsageBreakdown): readonly string[] {
  return [
    ...(state.scan.status === ScanStatus.Running ? [UiCopy.overview.scanning] : []),
    ...(breakdown.localSnapshotCount > 0
      ? [UiCopy.overview.snapshots(breakdown.localSnapshotCount)]
      : []),
    ...(breakdown.unreadableFolderCount > 0 && state.fullDiskAccess !== AccessState.Granted
      ? [UiCopy.overview.unreadable]
      : []),
  ];
}

const neutral: Tone = { icon: Glyph.barFull, color: ColorRole.muted };

function paneFor(state: AppState, row: DiskRowData, notes: readonly string[]): DetailView {
  const actions: readonly DetailAction[] = [
    ...(state.context.wholeDiskScope !== undefined && state.scope.kind !== ScanScopeKind.WholeDisk
      ? [
          {
            key: keyLabel[UserAction.ScanWholeDisk],
            label: UiCopy.actions[UserAction.ScanWholeDisk],
            action: UserAction.ScanWholeDisk,
            active: false,
          },
        ]
      : []),
    ...(notes.includes(UiCopy.overview.unreadable)
      ? [
          {
            key: keyLabel[UserAction.FixPermissions],
            label: UiCopy.actions[UserAction.FixPermissions],
            action: UserAction.FixPermissions,
            active: false,
          },
        ]
      : []),
  ];
  return {
    title: row.title,
    size: formatByteSize(row.size),
    tone: { ...neutral, color: row.color },
    verdict: "",
    meta: "",
    sections: [
      { label: UiCopy.detail.whatItIs, lines: [{ text: row.detail, color: ColorRole.text }] },
    ],
    notes: row.share === undefined ? [] : notes.map(caution),
    where: "",
    actions: row.share === undefined ? [] : actions,
  };
}

export function diskOverviewView(
  state: AppState,
  selected: number,
  viewport: Viewport,
): DiskOverviewView {
  const layout = bodyLayout(viewport);
  const breakdown = usageBreakdownOf(state);
  const base = {
    kind: ScreenKind.DiskOverview,
    filterHint: undefined,
    chips: [
      {
        label: UiCopy.tabs.disk,
        size: breakdown === undefined ? "" : formatByteSize(breakdown.capacity),
        active: true,
        filter: undefined,
      },
    ],
  } as const;
  if (breakdown === undefined) {
    return {
      ...base,
      emptyMessage: UiCopy.overview.loading,
      caption: undefined,
      pane: undefined,
      entries: [],
      hiddenAbove: 0,
      hiddenBelow: 0,
    };
  }
  const rows = rowsOf(state, breakdown);
  const notes = overviewNotes(state, breakdown);
  const window = visibleWindow(
    rows.length,
    selected,
    listCapacity(layout.list, bodyChromeLines(layout.pane !== undefined), 1),
  );
  const titleWidth = textWidth(
    layout.list,
    Layout.sizeColumnWidth + Layout.barWidth + Layout.rowChromeWidth + Layout.rowIconWidth,
  );
  const chosen = rows[selected];
  return {
    ...base,
    emptyMessage: undefined,
    caption: layout.pane === undefined ? captionOf(chosen?.detail, layout.list) : undefined,
    pane:
      layout.pane === undefined || chosen === undefined ? undefined : paneFor(state, chosen, notes),
    entries: rows.slice(window.start, window.end).map((row, offset): ListRow => ({
      kind: ListEntryKind.Row,
      index: window.start + offset,
      selected: window.start + offset === selected,
      selection: SelectionState.None,
      selectable: false,
      icon: "",
      color: row.color,
      barColor: row.color,
      size: padSize(formatByteSize(row.size)),
      bar: sizeBar(row.size, breakdown.capacity),
      title: truncate(row.title, titleWidth),
    })),
    hiddenAbove: window.start,
    hiddenBelow: rows.length - window.end,
  };
}
