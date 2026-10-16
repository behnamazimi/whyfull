import { ByteSize, FindingKind, type KnownItemFinding } from "../../../domain/index.ts";
import { ruleCopy } from "../../copy/rule-copy.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatAge } from "../../format/age-format.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { safetyTone, type Tone } from "../../theme.ts";
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
  type Viewport,
} from "./layout.ts";
import type { ListView } from "./list-row.ts";

const SECTION_COUNT = 3;
const LINES_PER_SECTION = 2;
const SUMMARY_LINES = 3;
const DETAIL_CHROME_LINES = SECTION_COUNT * LINES_PER_SECTION + SUMMARY_LINES;
const LINES_PER_ROW = 1;
const AGE_WIDTH = 16;

export interface DetailSection {
  readonly heading: string;
  readonly body: string;
}

export interface FindingDetailView extends ListView {
  readonly kind: typeof ScreenKind.FindingDetail;
  readonly title: string;
  readonly size: string;
  readonly tone: Tone;
  readonly safetyLabel: string;
  readonly sections: readonly DetailSection[];
  readonly remedyNote: string;
  readonly locationsHeading: string;
}

function knownFinding(state: AppState, index: number): KnownItemFinding | undefined {
  const finding = findingAt(state, index);
  return finding?.kind === FindingKind.KnownItem ? finding : undefined;
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
  const window = visibleWindow(
    locations.length,
    selected,
    listCapacity(viewport, DETAIL_CHROME_LINES, LINES_PER_ROW),
  );
  const largest = locations[0]?.size ?? ByteSize.zero;
  const width = textWidth(viewport, Layout.sizeColumnWidth + Layout.barWidth + AGE_WIDTH);
  return {
    kind: ScreenKind.FindingDetail,
    title: copy.title,
    size: formatByteSize(finding.size),
    tone,
    safetyLabel: UiCopy.safety[finding.rule.safety],
    sections: [
      { heading: UiCopy.detail.whatItIs, body: copy.whatItIs },
      { heading: UiCopy.detail.ifRemoved, body: copy.ifRemoved },
      { heading: UiCopy.detail.howToFreeSpace, body: copy.howToFreeSpace },
    ],
    remedyNote: UiCopy.remedies[finding.rule.remedy.kind],
    locationsHeading: UiCopy.detail.whereItIs,
    compact: true,
    rows: locations.slice(window.start, window.end).map((location, offset) => {
      const index = window.start + offset;
      return {
        index,
        selected: index === selected,
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
