import { ByteSize, FindingKind, ScanIssueKind, type Finding } from "../../../domain/index.ts";
import { ruleCopy } from "../../copy/rule-copy.ts";
import { ruleTag } from "../../copy/rule-labels.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { wholeMonths } from "../../format/age-format.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatCount } from "../../format/count-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { Glyph, safetyTone, SelectionState, unexplainedTone } from "../../theme.ts";
import { ScanStatus, type AppState } from "../state/app-state.ts";
import { ScreenKind } from "../state/screen.ts";
import {
  listCapacity,
  padSize,
  sizeBar,
  truncate,
  textWidth,
  visibleWindow,
  Layout,
  type Viewport,
} from "./layout.ts";
import { findingDetailView, type FindingDetailView } from "./finding-detail-view.ts";
import { growthLine, hasGrowthNews } from "./growth-view.ts";
import type { ListRow, ListView } from "./list-row.ts";
import { selectionOf } from "./selection-of.ts";

const LINES_PER_ROW = 2;
const NO_SELECTION = -1;
const SUBTITLE_LINES = 1;
const TAG_WIDTH = 8;
const DETAIL_INDENT_WIDTH = 5;

export interface DiagnosisView extends ListView {
  readonly kind: typeof ScreenKind.Diagnosis;
  readonly title: string;
  readonly subtitle: string | undefined;
  readonly emptyMessage: string | undefined;
  /** Set when the window is wide enough to show the selected finding beside the list. */
  readonly sidePane: { readonly detail: FindingDetailView | undefined } | undefined;
}

function subtitle(state: AppState, now: Date): string | undefined {
  const { scan } = state;
  if (scan.status !== ScanStatus.Completed) return undefined;
  if (state.growth !== undefined && hasGrowthNews(state.growth)) {
    return growthLine(state.growth, now);
  }
  const unreadable = scan.report.snapshot.issues.filter(
    (issue) => issue.kind === ScanIssueKind.PermissionDenied,
  ).length;
  return unreadable === 0 ? undefined : UiCopy.diagnosis.issues(formatCount(unreadable));
}

function findingRow(
  finding: Finding,
  index: number,
  context: {
    state: AppState;
    largest: ByteSize;
    selected: number;
    width: number;
    detailWidth: number;
  },
): ListRow {
  const { state, largest, selected, width, detailWidth } = context;
  const base = {
    index,
    selected: index === selected,
    selection:
      finding.kind === FindingKind.KnownItem
        ? selectionOf(finding.locations, state.cart)
        : SelectionState.None,
    size: padSize(formatByteSize(finding.size)),
    bar: sizeBar(finding.size, largest),
  };
  if (finding.kind === FindingKind.UnexplainedFolder) {
    return {
      ...base,
      ...unexplainedTone,
      title: truncate(formatPath(finding.path, state.context.home), width),
      detail: truncate(UiCopy.diagnosis.unexplainedSubtitle, detailWidth),
      tag: UiCopy.unexplainedLabel,
    };
  }
  const months = String(wholeMonths(state.context.diagnosisPolicy.staleAfter));
  const details = [
    UiCopy.categories[finding.rule.category],
    finding.locations.length > 1
      ? UiCopy.diagnosis.locations(formatCount(finding.locations.length))
      : undefined,
    finding.staleSize.isZero()
      ? undefined
      : UiCopy.diagnosis.untouched(formatByteSize(finding.staleSize), months),
  ].filter((part) => part !== undefined);
  return {
    ...base,
    ...safetyTone[finding.rule.safety],
    title: truncate(ruleCopy[finding.rule.id].title, width),
    detail: truncate(details.join(Glyph.separator), detailWidth),
    tag: ruleTag(finding.rule),
  };
}

function findingListView(
  state: AppState,
  selected: number,
  viewport: Viewport,
  now: Date,
): DiagnosisView {
  const findings = state.scan.findings;
  const window = visibleWindow(
    findings.length,
    selected,
    listCapacity(viewport, SUBTITLE_LINES, LINES_PER_ROW),
  );
  const largest = findings[0]?.size ?? ByteSize.zero;
  const width = textWidth(
    viewport,
    Layout.sizeColumnWidth + Layout.barWidth + Layout.rowChromeWidth + TAG_WIDTH,
  );
  const detailWidth = textWidth(viewport, DETAIL_INDENT_WIDTH);
  const emptyMessage =
    findings.length > 0
      ? undefined
      : state.scan.status === ScanStatus.Running
        ? UiCopy.scanning.nothingYet
        : UiCopy.diagnosis.empty;
  return {
    kind: ScreenKind.Diagnosis,
    title: UiCopy.diagnosis.title,
    subtitle: subtitle(state, now),
    emptyMessage,
    sidePane: undefined,
    compact: false,
    rows: findings.slice(window.start, window.end).map((finding, offset) =>
      findingRow(finding, window.start + offset, {
        state,
        largest,
        selected,
        width,
        detailWidth,
      }),
    ),
    hiddenAbove: window.start,
    hiddenBelow: findings.length - window.end,
  };
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
    sidePane: { detail: findingDetailView(state, selected, NO_SELECTION, detailViewport, now) },
  };
}
