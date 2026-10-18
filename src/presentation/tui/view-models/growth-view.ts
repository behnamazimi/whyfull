import {
  ByteSize,
  ChangeDirection,
  shrinkMayBeUnreadable,
  type FolderGrowth,
  type SnapshotDiff,
} from "../../../domain/index.ts";
import { formatAge } from "../../format/age-format.ts";
import { ruleCopy } from "../../copy/rule-copy.ts";
import { isCleanableByWhyfull } from "../../copy/rule-labels.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { keyLabel, UserAction } from "../../keymap.ts";
import { ColorRole, Glyph, SelectionState } from "../../theme.ts";
import type { AppState } from "../state/app-state.ts";
import { ScreenKind } from "../state/screen.ts";
import { classificationAt, folderAt } from "../state/selectors.ts";
import { bodyChromeLines, bodyLayout, stripOf, type BodyView } from "./body-view.ts";
import { plain, type DetailAction, type DetailView } from "./detail-view.ts";
import { ruleChecks } from "./rule-checks.ts";
import {
  chipCell,
  listCapacity,
  padSize,
  rowTitleWidth,
  sizeBar,
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
  const line = UiCopy.growth.sinceLastScan(formatAge(diff.previousTakenAt, now), change);
  return shrinkMayBeUnreadable(diff) ? `${line} ${UiCopy.growth.unreadableCaveat}` : line;
}

const grewBy = (size: ByteSize): string =>
  UiCopy.growth.changes[ChangeDirection.Grew](formatByteSize(size));

const action = (forAction: UserAction, label: string, active = false): DetailAction => ({
  key: keyLabel[forAction],
  label,
  action: forAction,
  active,
});

/** A grown folder can join the cleanup only when whyfull recognizes it and can clean it. */
const cleanableAt = (state: AppState, folder: FolderGrowth) => {
  const classification = classificationAt(state, folder.path);
  return classification !== undefined && isCleanableByWhyfull(classification.rule)
    ? classification
    : undefined;
};

function paneFor(state: AppState, folder: FolderGrowth): DetailView {
  const inScan = folderAt(state, folder.path) !== undefined;
  const classification = cleanableAt(state, folder);
  const inCart = state.cart.has(folder.path.toString());
  const copy = classification === undefined ? undefined : ruleCopy[classification.rule.id];
  return {
    title: copy?.title ?? folder.path.name,
    size: grewBy(folder.growth),
    tone: { icon: Glyph.folder, color: ColorRole.caution },
    verdict: UiCopy.growth.grewVerdict,
    meta: "",
    sections: [
      {
        label: UiCopy.growth.whatChanged,
        lines: [
          plain(
            (folder.beforeKnown ? UiCopy.growth.fromTo : UiCopy.growth.fromUnderTo)(
              formatByteSize(folder.before),
              formatByteSize(folder.after),
            ),
          ),
        ],
      },
      ...(copy === undefined
        ? []
        : [
            { label: UiCopy.detail.whatItIs, lines: [plain(copy.whatItIs)] },
            { label: UiCopy.detail.ifRemoved, lines: [plain(copy.ifRemoved)] },
          ]),
    ],
    checks: classification === undefined ? [] : ruleChecks(state, classification.rule),
    notes: [],
    where: formatPath(folder.path, state.context.home),
    actions: [
      ...(inScan ? [action(UserAction.Open, UiCopy.detail.lookInside)] : []),
      ...(classification === undefined
        ? []
        : [
            action(
              UserAction.ToggleCleanup,
              inCart ? UiCopy.detail.inCleanup : UiCopy.detail.add,
              inCart,
            ),
          ]),
    ],
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
  const showsChip = layout.pane !== undefined;
  const titleWidth = rowTitleWidth(layout.list, showsChip);
  const chosen = folders[selected];
  const pane = chosen === undefined ? undefined : paneFor(state, chosen);
  const emptyMessage =
    growth === undefined
      ? UiCopy.growth.firstScan
      : folders.length === 0
        ? UiCopy.growth.noneGrew(formatByteSize(state.context.historyPolicy.growthMinimumSize))
        : undefined;
  return {
    kind: ScreenKind.Growth,
    emptyMessage,
    strip: layout.pane === undefined ? stripOf(pane, layout.list) : [],
    pane: layout.pane === undefined ? undefined : (pane ?? howItWorksPane()),
    entries: folders.slice(window.start, window.end).map((folder, offset): ListRow => ({
      kind: ListEntryKind.Row,
      index: window.start + offset,
      selected: window.start + offset === selected,
      selection: state.cart.has(folder.path.toString()) ? SelectionState.All : SelectionState.None,
      selectable: cleanableAt(state, folder) !== undefined,
      icon: Glyph.folder,
      color: ColorRole.caution,
      barColor: ColorRole.caution,
      size: padSize(grewBy(folder.growth)),
      bar: sizeBar(folder.growth, largest),
      title: truncateStart(formatPath(folder.path, state.context.home), titleWidth),
      chip: chipCell(
        (folder.beforeKnown ? UiCopy.growth.was : UiCopy.growth.wasUnder)(
          formatByteSize(folder.before),
        ),
        showsChip,
      ),
      chipColor: ColorRole.muted,
      opens: folderAt(state, folder.path) !== undefined,
    })),
    hiddenAbove: window.start,
    hiddenBelow: folders.length - window.end,
  };
}

/** With nothing to show, the pane says what the tab is for, so it isn't left blank. */
function howItWorksPane(): DetailView {
  return {
    title: UiCopy.tabs.grew,
    size: "",
    tone: { icon: Glyph.folder, color: ColorRole.muted },
    verdict: UiCopy.growth.howItWorksVerdict,
    meta: "",
    sections: [{ label: UiCopy.growth.howItWorksLabel, lines: [plain(UiCopy.growth.howItWorks)] }],
    checks: [],
    notes: [],
    where: "",
    actions: [],
  };
}
