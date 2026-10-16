import { ByteSize, FindingKind, ScanIssueKind, type Finding } from "../../../domain/index.ts";
import { ruleCopy } from "../../copy/rule-copy.ts";
import { ruleTag } from "../../copy/rule-labels.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { wholeMonths } from "../../format/age-format.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatCount } from "../../format/count-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { Glyph, safetyTone, unexplainedTone } from "../../theme.ts";
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
import { growthLine } from "./growth-view.ts";
import type { ListRow, ListView } from "./list-row.ts";

const LINES_PER_ROW = 2;
const SUBTITLE_LINES = 1;
const TAG_WIDTH = 8;
const DETAIL_INDENT_WIDTH = 5;

export interface DiagnosisView extends ListView {
  readonly kind: typeof ScreenKind.Diagnosis;
  readonly title: string;
  readonly subtitle: string | undefined;
  readonly emptyMessage: string | undefined;
}

function subtitle(state: AppState, now: Date): string | undefined {
  const { scan } = state;
  if (scan.status !== ScanStatus.Completed) return undefined;
  if (state.growth !== undefined) return growthLine(state.growth, now);
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
    marked:
      finding.kind === FindingKind.KnownItem &&
      finding.locations.every((location) => state.cart.has(location.path.toString())),
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

export function diagnosisView(
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
  const width = textWidth(viewport, Layout.sizeColumnWidth + Layout.barWidth + TAG_WIDTH);
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
