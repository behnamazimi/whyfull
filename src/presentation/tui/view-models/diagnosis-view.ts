import {
  ByteSize,
  CartEntryKind,
  FindingKind,
  findingGroup,
  FindingGroup,
  ScanIssueKind,
  sizeOfGroup,
  type AbsolutePath,
  type Finding,
} from "../../../domain/index.ts";
import { ruleCopy } from "../../copy/rule-copy.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { wholeMonths } from "../../format/age-format.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatCount } from "../../format/count-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { ColorRole, Glyph, groupTone, SelectionState } from "../../theme.ts";
import { ScanStatus, type AppState } from "../state/app-state.ts";
import { availableFilters, FindingFilter } from "../state/finding-filter.ts";
import { ScreenKind } from "../state/screen.ts";
import { findingsOf, folderAt, folderEntries, FolderEntryKind } from "../state/selectors.ts";
import {
  listCapacity,
  padSize,
  sizeBar,
  truncate,
  truncateStart,
  textWidth,
  Layout,
  type Viewport,
} from "./layout.ts";
import { windowEntries } from "./grouped-window.ts";
import { findingDetailView, type FindingDetailView } from "./finding-detail-view.ts";
import { growthLine, hasGrowthNews } from "./growth-view.ts";
import {
  ListEntryKind,
  type GroupHeader,
  type ListEntry,
  type ListRow,
  type ListView,
} from "./list-row.ts";
import { selectionOf } from "./selection-of.ts";
import { unrecognizedDetailView, type UnrecognizedDetailView } from "./unrecognized-detail-view.ts";

const ONE_LINE = 1;
const NO_SELECTION = -1;
/** Space taken by a group header's icon, gaps and right edge, besides its words. */
const HEADER_DECORATION_WIDTH = 6;

export interface FilterChip {
  readonly filter: FindingFilter;
  readonly label: string;
  readonly count: string;
  readonly active: boolean;
}

export interface DiagnosisView extends ListView {
  readonly kind: typeof ScreenKind.Diagnosis;
  readonly title: string;
  /** What the whole list is worth, shown beside the title. */
  readonly aside: string | undefined;
  readonly chips: readonly FilterChip[];
  readonly subtitle: string | undefined;
  readonly emptyMessage: string | undefined;
  /** Set when the window is wide enough to show the selected finding beside the list. */
  readonly sidePane:
    { readonly detail: FindingDetailView | UnrecognizedDetailView | undefined } | undefined;
}

function subtitle(state: AppState, now: Date): string | undefined {
  const { scan } = state;
  if (scan.status === ScanStatus.Running) {
    return scan.findings.length === 0 ? undefined : UiCopy.scanning.sizesMayGrow;
  }
  if (scan.status !== ScanStatus.Completed) return undefined;
  if (state.growth !== undefined && hasGrowthNews(state.growth)) {
    return growthLine(state.growth, now);
  }
  const unreadable = scan.report.snapshot.issues.filter(
    (issue) => issue.kind === ScanIssueKind.PermissionDenied,
  ).length;
  return unreadable === 0 ? undefined : UiCopy.diagnosis.issues(unreadable);
}

function chipsOf(state: AppState): readonly FilterChip[] {
  const filters = availableFilters(state.scan.findings);
  const onlyOneGroup = filters.length <= ONE_LINE + ONE_LINE;
  if (onlyOneGroup) return [];
  return filters.map((filter) => ({
    filter,
    label: UiCopy.filters[filter],
    count: formatCount(
      state.scan.findings.filter(
        (finding) => filter === FindingFilter.All || findingGroup(finding) === filter,
      ).length,
    ),
    active: filter === state.findingFilter,
  }));
}

const isHighRiskInCart = (state: AppState, paths: readonly AbsolutePath[]): boolean =>
  paths.some((path) => state.cart.get(path.toString())?.kind === CartEntryKind.HighRisk);

type Slot =
  | { readonly kind: typeof ListEntryKind.Header; readonly group: FindingGroup }
  | {
      readonly kind: typeof ListEntryKind.Row;
      readonly finding: Finding;
      readonly index: number;
    };

/** The findings arrive grouped, so a header goes in wherever the group changes. */
function slotsOf(findings: readonly Finding[]): readonly Slot[] {
  return findings.flatMap((finding, index): Slot[] => {
    const group = findingGroup(finding);
    const startsGroup = index === 0 || findingGroup(findings[index - 1] ?? finding) !== group;
    const row: Slot = { kind: ListEntryKind.Row, finding, index };
    return startsGroup ? [{ kind: ListEntryKind.Header, group }, row] : [row];
  });
}

function titleOf(finding: Finding): string {
  return finding.kind === FindingKind.KnownItem
    ? ruleCopy[finding.rule.id].title
    : finding.path.name;
}

function noteOf(state: AppState, finding: Finding): string {
  if (finding.kind === FindingKind.UnexplainedFolder) {
    const { parent } = finding.path;
    return parent === undefined ? "" : `${formatPath(parent, state.context.home)}/`;
  }
  const months = String(wholeMonths(state.context.diagnosisPolicy.staleAfter));
  return [
    UiCopy.categories[finding.rule.category],
    finding.locations.length > 1 ? UiCopy.diagnosis.locations(finding.locations.length) : undefined,
    finding.staleSize.isZero()
      ? undefined
      : UiCopy.diagnosis.untouched(formatByteSize(finding.staleSize), months),
  ]
    .filter((part) => part !== undefined)
    .join(Glyph.separator);
}

function headerEntry(state: AppState, group: FindingGroup, columns: number): GroupHeader {
  const copy = UiCopy.groups[group];
  const total = formatByteSize(sizeOfGroup(state.scan.findings, group));
  const hintFits =
    HEADER_DECORATION_WIDTH + copy.title.length + copy.hint.length + total.length <=
    columns - Layout.horizontalPadding;
  return {
    kind: ListEntryKind.Header,
    icon: groupTone[group].icon,
    color: groupTone[group].color,
    title: copy.title,
    hint: hintFits ? copy.hint : "",
    total,
  };
}

function findingRow(
  finding: Finding,
  index: number,
  context: {
    state: AppState;
    largest: ByteSize;
    selected: number;
    titleWidth: number;
    noteWidth: number;
  },
): ListRow {
  const { state, largest, selected, titleWidth, noteWidth } = context;
  const paths =
    finding.kind === FindingKind.KnownItem
      ? finding.locations.map((location) => location.path)
      : [finding.path];
  const group = findingGroup(finding);
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
    icon: "",
    color: isHighRiskInCart(state, paths) ? ColorRole.danger : groupTone[group].color,
    barColor: groupTone[group].color,
    size: padSize(formatByteSize(finding.size)),
    bar: sizeBar(finding.size, largest),
    title: truncate(titleOf(finding), titleWidth).padEnd(titleWidth),
    note:
      noteWidth < Layout.rowNoteMinimumWidth
        ? ""
        : finding.kind === FindingKind.UnexplainedFolder
          ? truncateStart(noteOf(state, finding), noteWidth)
          : truncate(noteOf(state, finding), noteWidth),
    tag: isHighRiskInCart(state, paths) ? UiCopy.highRisk.listTag : "",
  };
}

function findingListView(
  state: AppState,
  selected: number,
  viewport: Viewport,
  now: Date,
): DiagnosisView {
  const findings = findingsOf(state);
  const chips = chipsOf(state);
  const note = subtitle(state, now);
  const slots = slotsOf(findings);
  const selectedSlot = slots.findIndex(
    (slot) => slot.kind === ListEntryKind.Row && slot.index === selected,
  );
  const chromeLines =
    (chips.length === 0 ? 0 : Layout.filterChipLines) + (note === undefined ? 0 : ONE_LINE);
  const window = windowEntries(
    slots,
    Math.max(0, selectedSlot),
    listCapacity(viewport, chromeLines, ONE_LINE),
  );
  const shown = slots.slice(window.start, window.end);
  const available = textWidth(
    viewport,
    Layout.sizeColumnWidth + Layout.barWidth + Layout.rowChromeWidth,
  );
  const longestTitle = Math.max(
    0,
    ...shown.map((slot) => (slot.kind === ListEntryKind.Row ? titleOf(slot.finding).length : 0)),
  );
  const titleWidth = Math.min(longestTitle, Layout.rowTitleMaximumWidth, available);
  const noteWidth = available - titleWidth - ONE_LINE;
  const largest = state.scan.findings.reduce(
    (biggest, finding) => (finding.size.isAtLeast(biggest) ? finding.size : biggest),
    ByteSize.zero,
  );
  const entries: readonly ListEntry[] = shown.map((slot) =>
    slot.kind === ListEntryKind.Header
      ? headerEntry(state, slot.group, viewport.columns)
      : findingRow(slot.finding, slot.index, { state, largest, selected, titleWidth, noteWidth }),
  );
  const reclaimable = sizeOfGroup(state.scan.findings, FindingGroup.Safe);
  const emptyMessage =
    findings.length > 0
      ? undefined
      : state.scan.findings.length > 0
        ? UiCopy.diagnosis.nothingInFilter
        : state.scan.status === ScanStatus.Running
          ? UiCopy.scanning.nothingYet
          : emptyDiagnosis(state);
  return {
    kind: ScreenKind.Diagnosis,
    title: UiCopy.diagnosis.title,
    aside: reclaimable.isZero()
      ? undefined
      : UiCopy.diagnosis.reclaimable(formatByteSize(reclaimable)),
    chips,
    subtitle: note,
    emptyMessage,
    sidePane: undefined,
    entries,
    hiddenAbove: window.hiddenAbove,
    hiddenBelow: window.hiddenBelow,
  };
}

function sidePaneDetail(
  state: AppState,
  selected: number,
  viewport: Viewport,
  now: Date,
): FindingDetailView | UnrecognizedDetailView | undefined {
  const finding = findingsOf(state)[selected];
  return finding?.kind === FindingKind.UnexplainedFolder
    ? unrecognizedDetailView(state, finding, now)
    : findingDetailView(state, selected, NO_SELECTION, viewport, now);
}

const LARGEST_FOLDERS_SHOWN = 3;

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

export function diagnosisView(
  state: AppState,
  selected: number,
  viewport: Viewport,
  now: Date,
): DiagnosisView {
  if (viewport.columns < Layout.splitPaneMinimumColumns) {
    return findingListView(state, selected, viewport, now);
  }
  const listViewport = { ...viewport, columns: viewport.columns - Layout.detailPaneColumns };
  const detailViewport = { ...viewport, columns: Layout.detailPaneColumns - 1 };
  return {
    ...findingListView(state, selected, listViewport, now),
    sidePane: { detail: sidePaneDetail(state, selected, detailViewport, now) },
  };
}
