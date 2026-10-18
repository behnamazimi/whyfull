import {
  ByteSize,
  CartEntryKind,
  FindingKind,
  findingGroup,
  runningOwnerApp,
  type AbsolutePath,
  type Finding,
} from "../../../domain/index.ts";
import { ruleCopy } from "../../copy/rule-copy.ts";
import { isCleanableByWhyfull, ruleChip } from "../../copy/rule-labels.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { ColorRole, Glyph, groupTone, SelectionState } from "../../theme.ts";
import { highRiskBlockAt } from "../state/high-risk-reducer.ts";
import { ScanStatus, type AppState } from "../state/app-state.ts";
import { NavKind, navigationOf, type NavItem } from "../state/navigation.ts";
import { ScreenKind } from "../state/screen.ts";
import { folderAt, folderEntries, FolderEntryKind } from "../state/selectors.ts";
import { bodyChromeLines, bodyLayout, stripOf, type BodyView } from "./body-view.ts";
import { findingPaneView } from "./finding-pane-view.ts";
import { groupPaneView } from "./group-pane-view.ts";
import { windowEntries } from "./grouped-window.ts";
import {
  chipCell,
  Layout,
  listCapacity,
  padSize,
  rowTitleWidth,
  sizeBar,
  truncateMiddle,
  type Viewport,
} from "./layout.ts";
import { ListEntryKind, type GroupHeader, type ListEntry, type ListRow } from "./list-row.ts";
import { selectionOf } from "./selection-of.ts";

/** Space taken by a group header's arrow, icon, gaps and right edge, besides its words. */
const HEADER_DECORATION_WIDTH = 8;
const LARGEST_FOLDERS_SHOWN = 3;

export interface DiagnosisView extends BodyView {
  readonly kind: typeof ScreenKind.Diagnosis;
}

const isHighRiskInCart = (state: AppState, paths: readonly AbsolutePath[]): boolean =>
  paths.some((path) => state.cart.get(path.toString())?.kind === CartEntryKind.HighRisk);

/** Unrecognized folders show where they are, because many are called "projects" or "Cache". */
function titleOf(finding: Finding, home: AbsolutePath): string {
  return finding.kind === FindingKind.KnownItem
    ? ruleCopy[finding.rule.id].title
    : formatPath(finding.path, home);
}

type GroupItem = Extract<NavItem, { readonly kind: typeof NavKind.Group }>;

function headerEntry(
  group: GroupItem,
  context: { index: number; selected: number; columns: number },
): GroupHeader {
  const copy = UiCopy.groups[group.group];
  const total = formatByteSize(ByteSize.sum(group.findings.map((finding) => finding.size)));
  const hint = group.folded ? UiCopy.list.itemCount(group.findings.length) : copy.hint;
  const hintFits =
    HEADER_DECORATION_WIDTH + copy.title.length + hint.length + total.length <=
    context.columns - Layout.horizontalPadding;
  return {
    kind: ListEntryKind.Header,
    index: context.index,
    selected: context.index === context.selected,
    folded: group.folded,
    icon: groupTone[group.group].icon,
    color: groupTone[group.group].color,
    title: copy.title,
    hint: hintFits ? hint : "",
    total,
  };
}

function chipOf(state: AppState, finding: Finding): { text: string; color: ColorRole } {
  if (finding.kind === FindingKind.UnexplainedFolder) return { text: "", color: ColorRole.muted };
  const app = isCleanableByWhyfull(finding.rule)
    ? runningOwnerApp([finding.rule], state.runningApps)
    : undefined;
  return app === undefined
    ? { text: ruleChip(finding.rule), color: ColorRole.muted }
    : { text: UiCopy.chips.quitApp(app), color: ColorRole.caution };
}

function findingRow(
  finding: Finding,
  context: {
    state: AppState;
    index: number;
    selected: number;
    largest: ByteSize;
    titleWidth: number;
    showsChip: boolean;
  },
): ListRow {
  const { state, index, selected, largest, titleWidth, showsChip } = context;
  const paths =
    finding.kind === FindingKind.KnownItem
      ? finding.locations.map((location) => location.path)
      : [finding.path];
  const group = findingGroup(finding);
  const risky = isHighRiskInCart(state, paths);
  const chip = chipOf(state, finding);
  return {
    kind: ListEntryKind.Row,
    index,
    selected: index === selected,
    selection:
      finding.kind === FindingKind.KnownItem
        ? selectionOf(finding.locations, state.cart)
        : state.cart.has(finding.path.toString())
          ? SelectionState.All
          : SelectionState.None,
    selectable:
      finding.kind === FindingKind.UnexplainedFolder
        ? highRiskBlockAt(state, finding.path) === undefined
        : isCleanableByWhyfull(finding.rule),
    icon: risky ? Glyph.warning : "",
    color: risky ? ColorRole.danger : groupTone[group].color,
    barColor: groupTone[group].color,
    size: padSize(formatByteSize(finding.size)),
    bar: sizeBar(finding.size, largest),
    title: truncateMiddle(titleOf(finding, state.context.home), titleWidth),
    chip: chipCell(chip.text, showsChip),
    chipColor: chip.color,
    opens: true,
  };
}

function emptyDiagnosis(state: AppState): string {
  const root = folderAt(state, state.scope.root);
  const largest =
    root === undefined
      ? []
      : folderEntries(state, root)
          .filter((entry) => entry.kind === FolderEntryKind.Folder)
          .slice(0, LARGEST_FOLDERS_SHOWN);
  if (largest.length === 0) return UiCopy.diagnosis.empty;
  return [
    UiCopy.diagnosis.emptyWithFolders,
    ...largest.map((entry) => `${formatByteSize(entry.size)}  ${entry.path.name}`),
    UiCopy.diagnosis.emptyBrowse,
  ].join("\n");
}

function emptyMessageOf(state: AppState, navigation: readonly NavItem[]): string | undefined {
  if (navigation.length > 0) return undefined;
  return state.scan.status === ScanStatus.Running
    ? UiCopy.scanning.nothingYet
    : emptyDiagnosis(state);
}

export function diagnosisView(
  state: AppState,
  selected: number,
  viewport: Viewport,
  now: Date,
): DiagnosisView {
  const layout = bodyLayout(viewport);
  const showsChip = layout.pane !== undefined;
  const navigation = navigationOf(state);
  const chosen = navigation[selected];
  const pane =
    chosen === undefined
      ? undefined
      : chosen.kind === NavKind.Group
        ? groupPaneView(state, chosen)
        : findingPaneView(state, chosen.finding, now);
  const window = windowEntries(
    navigation.map((item) => ({
      kind: item.kind === NavKind.Group ? ListEntryKind.Header : ListEntryKind.Row,
    })),
    selected,
    listCapacity(layout.list, bodyChromeLines(layout.pane !== undefined), 1),
  );
  const titleWidth = rowTitleWidth(layout.list, showsChip);
  const largest = state.scan.findings.reduce(
    (biggest, finding) => (finding.size.isAtLeast(biggest) ? finding.size : biggest),
    ByteSize.zero,
  );
  const entries: readonly ListEntry[] = navigation
    .slice(window.start, window.end)
    .map((item, offset): ListEntry => {
      const index = window.start + offset;
      return item.kind === NavKind.Group
        ? headerEntry(item, { index, selected, columns: layout.list.columns })
        : findingRow(item.finding, { state, index, selected, largest, titleWidth, showsChip });
    });
  return {
    kind: ScreenKind.Diagnosis,
    emptyMessage: emptyMessageOf(state, navigation),
    strip: layout.pane === undefined ? stripOf(pane, layout.list) : [],
    pane: layout.pane === undefined ? undefined : pane,
    entries,
    hiddenAbove: window.hiddenAbove,
    hiddenBelow: window.hiddenBelow,
  };
}
