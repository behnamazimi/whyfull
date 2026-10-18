import type { FindingGroup } from "../../../domain/index.ts";
import {
  ByteSize,
  CartEntryKind,
  FindingKind,
  findingGroup,
  sizeOfGroup,
  type AbsolutePath,
  type Finding,
} from "../../../domain/index.ts";
import { ruleCopy } from "../../copy/rule-copy.ts";
import { isCleanableByWhyfull } from "../../copy/rule-labels.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { keyLabel, UserAction } from "../../keymap.ts";
import { formatPath } from "../../format/path-format.ts";
import { ColorRole, Glyph, groupTone, SelectionState } from "../../theme.ts";
import { highRiskBlockAt } from "../state/high-risk-reducer.ts";
import { ScanStatus, type AppState } from "../state/app-state.ts";
import { availableFilters, FindingFilter } from "../state/finding-filter.ts";
import { ScreenKind } from "../state/screen.ts";
import { findingsOf, folderAt, folderEntries, FolderEntryKind } from "../state/selectors.ts";
import {
  bodyChromeLines,
  bodyLayout,
  captionOf,
  type BodyView,
  type FilterChip,
} from "./body-view.ts";
import { findingPaneView } from "./finding-pane-view.ts";
import { windowEntries } from "./grouped-window.ts";
import {
  Layout,
  listCapacity,
  padSize,
  sizeBar,
  textWidth,
  truncateMiddle,
  type Viewport,
} from "./layout.ts";
import { ListEntryKind, type GroupHeader, type ListEntry, type ListRow } from "./list-row.ts";
import { selectionOf } from "./selection-of.ts";

/** Space taken by a group header's icon, gaps and right edge, besides its words. */
const HEADER_DECORATION_WIDTH = 6;
const LARGEST_FOLDERS_SHOWN = 3;

export interface DiagnosisView extends BodyView {
  readonly kind: typeof ScreenKind.Diagnosis;
}

const sizeOfFilter = (state: AppState, filter: FindingFilter): ByteSize =>
  filter === FindingFilter.All
    ? ByteSize.sum(state.scan.findings.map((finding) => finding.size))
    : sizeOfGroup(state.scan.findings, filter);

const CHIP_PADDING_WIDTH = 2;
const CHIP_SIZE_SEPARATOR_WIDTH = 1;
const CHIP_GAP_WIDTH = 1;
const CHIP_ROW_PADDING_WIDTH = 2;

const chipWidth = (chip: FilterChip): number =>
  CHIP_PADDING_WIDTH +
  chip.label.length +
  (chip.size === "" ? 0 : CHIP_SIZE_SEPARATOR_WIDTH + chip.size.length);

const chipsWidth = (chips: readonly FilterChip[]): number =>
  chips.reduce((total, chip) => total + chipWidth(chip) + CHIP_GAP_WIDTH, 0);

/**
 * The chips are one line. What goes first when they would not fit: the sizes, then the hint. The
 * chips themselves always stay.
 */
function fittedChips(
  chips: readonly FilterChip[],
  columns: number,
): Pick<DiagnosisView, "chips" | "filterHint"> {
  const hint =
    chips.length > 1 ? UiCopy.list.filterHint(keyLabel[UserAction.CycleFilter]) : undefined;
  const room = columns - CHIP_ROW_PADDING_WIDTH;
  const hintWidth = hint === undefined ? 0 : hint.length + CHIP_GAP_WIDTH;
  const bare = chips.map((chip) => ({ ...chip, size: "" }));
  if (chipsWidth(chips) + hintWidth <= room) return { chips, filterHint: hint };
  if (chipsWidth(bare) + hintWidth <= room) return { chips: bare, filterHint: hint };
  return { chips: bare, filterHint: undefined };
}

function chipsOf(state: AppState): readonly FilterChip[] {
  return availableFilters(state.scan.findings).map((filter) => ({
    filter,
    label: UiCopy.filters[filter],
    size: sizeOfFilter(state, filter).isZero() ? "" : formatByteSize(sizeOfFilter(state, filter)),
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

/** Unrecognized folders show where they are, because many are called "projects" or "Cache". */
function titleOf(finding: Finding, home: AbsolutePath): string {
  return finding.kind === FindingKind.KnownItem
    ? ruleCopy[finding.rule.id].title
    : formatPath(finding.path, home);
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
  },
): ListRow {
  const { state, largest, selected, titleWidth } = context;
  const paths =
    finding.kind === FindingKind.KnownItem
      ? finding.locations.map((location) => location.path)
      : [finding.path];
  const group = findingGroup(finding);
  const risky = isHighRiskInCart(state, paths);
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

function emptyMessageOf(state: AppState, shown: readonly Finding[]): string | undefined {
  if (shown.length > 0) return undefined;
  if (state.scan.findings.length > 0) return UiCopy.diagnosis.nothingInFilter;
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
  const findings = findingsOf(state);
  const chosen = findings[selected];
  const pane = chosen === undefined ? undefined : findingPaneView(state, chosen, now);
  const slots = slotsOf(findings);
  const selectedSlot = slots.findIndex(
    (slot) => slot.kind === ListEntryKind.Row && slot.index === selected,
  );
  const window = windowEntries(
    slots,
    Math.max(0, selectedSlot),
    listCapacity(layout.list, bodyChromeLines(layout.pane !== undefined), 1),
  );
  const shown = slots.slice(window.start, window.end);
  const titleWidth = textWidth(
    layout.list,
    Layout.sizeColumnWidth + Layout.barWidth + Layout.rowChromeWidth + Layout.rowIconWidth,
  );
  const largest = state.scan.findings.reduce(
    (biggest, finding) => (finding.size.isAtLeast(biggest) ? finding.size : biggest),
    ByteSize.zero,
  );
  const entries: readonly ListEntry[] = shown.map((slot) =>
    slot.kind === ListEntryKind.Header
      ? headerEntry(state, slot.group, layout.list.columns)
      : findingRow(slot.finding, slot.index, { state, largest, selected, titleWidth }),
  );
  return {
    kind: ScreenKind.Diagnosis,
    ...fittedChips(chipsOf(state), layout.list.columns),
    emptyMessage: emptyMessageOf(state, findings),
    caption: layout.pane === undefined ? captionOf(pane?.verdict, layout.list) : undefined,
    pane: layout.pane === undefined ? undefined : pane,
    entries,
    hiddenAbove: window.hiddenAbove,
    hiddenBelow: window.hiddenBelow,
  };
}
