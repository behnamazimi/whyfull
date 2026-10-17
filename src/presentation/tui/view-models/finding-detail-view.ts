import { ByteSize, FindingKind, type KnownItemFinding } from "../../../domain/index.ts";
import { isCleanableByWhyfull } from "../../copy/rule-labels.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { safetyTone } from "../../theme.ts";
import type { AppState } from "../state/app-state.ts";
import { ScreenKind } from "../state/screen.ts";
import { findingAt } from "../state/selectors.ts";
import type { DetailView } from "./detail-view.ts";
import { findingPaneView } from "./finding-pane-view.ts";
import {
  Layout,
  listCapacity,
  padSize,
  sizeBar,
  textWidth,
  truncateStart,
  visibleWindow,
  wrappedLineCount,
  type Viewport,
} from "./layout.ts";
import { ListEntryKind, type ListView } from "./list-row.ts";
import { selectionOf } from "./selection-of.ts";

/** The title, the verdict and the blank line after them. */
const HEADING_LINES = 3;
const SECTION_GAP_LINES = 1;
const LOCATIONS_HEADING_LINES = 1;
const SECTION_LABEL_LINES = 1;
const LINES_PER_ROW = 1;

/** One item's explanation, with each of its places listed under it so places can be chosen one by one. */
export interface FindingDetailView extends ListView {
  readonly kind: typeof ScreenKind.FindingDetail;
  readonly pane: DetailView;
  readonly locationsHeading: string;
}

function knownFinding(state: AppState, index: number): KnownItemFinding | undefined {
  const finding = findingAt(state, index);
  return finding?.kind === FindingKind.KnownItem ? finding : undefined;
}

function explanationLines(pane: DetailView, width: number): number {
  const sections = pane.sections.reduce(
    (total, section) =>
      total +
      SECTION_LABEL_LINES +
      SECTION_GAP_LINES +
      section.lines.reduce((count, line) => count + wrappedLineCount(line.text, width), 0),
    0,
  );
  return (
    sections + pane.notes.reduce((count, note) => count + wrappedLineCount(note.text, width), 0)
  );
}

export function findingDetailView(
  state: AppState,
  findingIndex: number,
  selected: number,
  viewport: Viewport,
  now: Date,
): FindingDetailView | undefined {
  const finding = knownFinding(state, findingIndex);
  if (finding === undefined) return undefined;
  const pane = findingPaneView(state, finding, now);
  const tone = safetyTone[finding.rule.safety];
  const { locations } = finding;
  const window = visibleWindow(
    locations.length,
    selected,
    listCapacity(
      viewport,
      HEADING_LINES + explanationLines(pane, textWidth(viewport, 0)) + LOCATIONS_HEADING_LINES,
      LINES_PER_ROW,
    ),
  );
  const largest = locations[0]?.size ?? ByteSize.zero;
  const width = textWidth(
    viewport,
    Layout.sizeColumnWidth + Layout.barWidth + Layout.rowChromeWidth + Layout.rowIconWidth,
  );
  return {
    kind: ScreenKind.FindingDetail,
    pane,
    locationsHeading: UiCopy.detail.whereItIs,
    entries: locations.slice(window.start, window.end).map((location, offset) => {
      const index = window.start + offset;
      return {
        kind: ListEntryKind.Row,
        index,
        selected: index === selected,
        selection: selectionOf([location], state.cart),
        selectable: isCleanableByWhyfull(location.rule),
        icon: "",
        color: tone.color,
        barColor: tone.color,
        size: padSize(formatByteSize(location.size)),
        bar: sizeBar(location.size, largest),
        title: truncateStart(formatPath(location.path, state.context.home), width),
      };
    }),
    hiddenAbove: window.start,
    hiddenBelow: locations.length - window.end,
  };
}
