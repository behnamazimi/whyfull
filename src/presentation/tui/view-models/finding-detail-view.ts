import { ByteSize, FindingKind, type KnownItemFinding } from "../../../domain/index.ts";
import { ruleCopy } from "../../copy/rule-copy.ts";
import { isCleanableByWhyfull, ruleTag, whoCleansUp } from "../../copy/rule-labels.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatAge } from "../../format/age-format.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { Palette, safetyTone, type Tone } from "../../theme.ts";
import type { AppState } from "../state/app-state.ts";
import { ScreenKind } from "../state/screen.ts";
import { findingAt } from "../state/selectors.ts";
import {
  Layout,
  listCapacity,
  padSize,
  sizeBar,
  textWidth,
  truncate,
  visibleWindow,
  wrappedLineCount,
  type Viewport,
} from "./layout.ts";
import type { ListView } from "./list-row.ts";

const TAG_AND_GAP_LINES = 2;
const SECTION_GAP_LINES = 1;
const LOCATIONS_HEADING_LINES = 1;
export const DETAIL_LABEL_WIDTH = 14;
const LINES_PER_ROW = 1;
const AGE_WIDTH = 16;

export interface DetailLine {
  readonly text: string;
  readonly color: string;
}

export interface DetailSection {
  readonly label: string;
  readonly lines: readonly DetailLine[];
}

export interface FindingDetailView extends ListView {
  readonly kind: typeof ScreenKind.FindingDetail;
  readonly title: string;
  readonly size: string;
  readonly tone: Tone;
  readonly tag: string;
  readonly sections: readonly DetailSection[];
  readonly locationsHeading: string;
}

function knownFinding(state: AppState, index: number): KnownItemFinding | undefined {
  const finding = findingAt(state, index);
  return finding?.kind === FindingKind.KnownItem ? finding : undefined;
}

const plain = (text: string): DetailLine => ({ text, color: Palette.text });

function cleaningUpLines(finding: KnownItemFinding, state: AppState): readonly DetailLine[] {
  const { rule, locations } = finding;
  const who: DetailLine = { text: whoCleansUp(rule), color: Palette.text };
  const how = plain(ruleCopy[rule.id].howToFreeSpace);
  if (!isCleanableByWhyfull(rule)) return [who, how];
  const inCart = locations.every((location) => state.cart.has(location.path.toString()));
  const callToAction: DetailLine = inCart
    ? { text: UiCopy.addToCleanup.added, color: Palette.safe }
    : {
        text: locations.length > 1 ? UiCopy.addToCleanup.several : UiCopy.addToCleanup.one,
        color: Palette.accent,
      };
  return [who, how, callToAction];
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
  const copy = ruleCopy[finding.rule.id];
  const tone = safetyTone[finding.rule.safety];
  const { locations } = finding;
  const sections: readonly DetailSection[] = [
    { label: UiCopy.detail.whatItIs, lines: [plain(copy.whatItIs)] },
    { label: UiCopy.detail.ifRemoved, lines: [plain(copy.ifRemoved)] },
    { label: UiCopy.detail.cleaningUp, lines: cleaningUpLines(finding, state) },
  ];
  const sectionTextWidth = textWidth(viewport, DETAIL_LABEL_WIDTH);
  const sectionLines = sections.reduce(
    (total, section) =>
      total +
      SECTION_GAP_LINES +
      section.lines.reduce(
        (count, line) => count + wrappedLineCount(line.text, sectionTextWidth),
        0,
      ),
    0,
  );
  const window = visibleWindow(
    locations.length,
    selected,
    listCapacity(
      viewport,
      TAG_AND_GAP_LINES + sectionLines + LOCATIONS_HEADING_LINES,
      LINES_PER_ROW,
    ),
  );
  const largest = locations[0]?.size ?? ByteSize.zero;
  const width = textWidth(viewport, Layout.sizeColumnWidth + Layout.barWidth + AGE_WIDTH);
  return {
    kind: ScreenKind.FindingDetail,
    title: copy.title,
    size: formatByteSize(finding.size),
    tone,
    tag: ruleTag(finding.rule),
    sections,
    locationsHeading: UiCopy.detail.whereItIs,
    compact: true,
    rows: locations.slice(window.start, window.end).map((location, offset) => {
      const index = window.start + offset;
      return {
        index,
        selected: index === selected,
        marked: state.cart.has(location.path.toString()),
        ...tone,
        size: padSize(formatByteSize(location.size)),
        bar: sizeBar(location.size, largest),
        title: truncate(formatPath(location.path, state.context.home), width),
        detail: formatAge(location.lastModified, now),
        tag: "",
      };
    }),
    hiddenAbove: window.start,
    hiddenBelow: locations.length - window.end,
  };
}
