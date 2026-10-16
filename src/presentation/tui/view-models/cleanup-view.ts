import {
  CleanupActionKind,
  OutcomeKind,
  pathsOf,
  totalSizeOf,
  type AbsolutePath,
  type ApprovedAction,
  type CleanupAction,
} from "../../../domain/index.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatCount } from "../../format/count-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { ColorRole } from "../../theme.ts";
import { CleanupPhase, type AppState } from "../state/app-state.ts";
import { ScreenKind } from "../state/screen.ts";
import { Layout, padSize, textWidth, truncateMiddle, type Viewport } from "./layout.ts";

export interface CleanupRow {
  readonly label: string;
  readonly target: string;
  readonly size: string;
  readonly color: ColorRole;
}

export interface CleanupReviewView {
  readonly kind: typeof ScreenKind.CleanupReview;
  readonly title: string;
  readonly status: string | undefined;
  readonly rows: readonly CleanupRow[];
  /** One line per row, used when two lines per row would not fit the window. */
  readonly compact: boolean;
  readonly hiddenRows: string | undefined;
  readonly blockedHeading: string;
  readonly blocked: readonly CleanupRow[];
  readonly summary: readonly string[];
}

export interface CleanupReportView {
  readonly kind: typeof ScreenKind.CleanupReport;
  readonly title: string;
  readonly summary: readonly string[];
  readonly problemsHeading: string | undefined;
  readonly problems: readonly CleanupRow[];
}

const actionColor: Readonly<Record<CleanupActionKind, ColorRole>> = {
  [CleanupActionKind.Delete]: ColorRole.safe,
  [CleanupActionKind.MoveToTrash]: ColorRole.caution,
  [CleanupActionKind.RunOwnerTool]: ColorRole.safe,
};

function describeTargets(paths: readonly AbsolutePath[], home: AbsolutePath): string {
  const [first, ...rest] = paths;
  if (first === undefined) return "";
  const more = rest.length === 0 ? "" : UiCopy.cleanup.andMore(formatCount(rest.length));
  return formatPath(first, home) + more;
}

function actionLabel(action: CleanupAction): string {
  return action.kind === CleanupActionKind.RunOwnerTool
    ? UiCopy.cleanup.tools[action.tool]
    : UiCopy.cleanup.actions[action.kind];
}

function actionRow(action: CleanupAction, home: AbsolutePath, targetWidth: number): CleanupRow {
  return {
    label: actionLabel(action),
    target: truncateMiddle(describeTargets(pathsOf(action), home), targetWidth),
    size: padSize(formatByteSize(action.size)),
    color: actionColor[action.kind],
  };
}

function reviewSummary(actions: readonly ApprovedAction[]): string[] {
  if (actions.length === 0) return [UiCopy.cleanup.nothingToDo];
  const ofKind = (kind: CleanupActionKind): ApprovedAction[] =>
    actions.filter((action) => action.kind === kind);
  const summaryLine = (
    kind: CleanupActionKind,
    describe: (size: string) => string,
  ): readonly string[] => {
    const matching = ofKind(kind);
    return matching.length === 0 ? [] : [describe(formatByteSize(totalSizeOf(matching)))];
  };
  return [
    ...summaryLine(CleanupActionKind.Delete, UiCopy.cleanup.willFree),
    ...summaryLine(CleanupActionKind.MoveToTrash, UiCopy.cleanup.willTrash),
    ...summaryLine(CleanupActionKind.RunOwnerTool, UiCopy.cleanup.toolsMayFree),
  ];
}

const LINES_PER_ROW = 2;
const BLOCKED_CHROME_LINES = 2;

function fitRows(
  rows: readonly CleanupRow[],
  availableLines: number,
): Pick<CleanupReviewView, "rows" | "compact" | "hiddenRows"> {
  if (rows.length * LINES_PER_ROW <= availableLines) {
    return { rows, compact: false, hiddenRows: undefined };
  }
  if (rows.length <= availableLines) return { rows, compact: true, hiddenRows: undefined };
  const shown = Math.max(1, availableLines - 1);
  return {
    rows: rows.slice(0, shown),
    compact: true,
    hiddenRows: UiCopy.cleanup.hiddenRows(formatCount(rows.length - shown)),
  };
}

export function cleanupReviewView(state: AppState, viewport: Viewport): CleanupReviewView {
  const { cleanup } = state;
  const home = state.context.home;
  const base = {
    kind: ScreenKind.CleanupReview,
    title: UiCopy.cleanup.reviewTitle,
    blockedHeading: UiCopy.cleanup.notIncluded,
  } as const;
  if (cleanup.phase !== CleanupPhase.Reviewing && cleanup.phase !== CleanupPhase.Running) {
    return {
      ...base,
      status: UiCopy.cleanup.planning,
      rows: [],
      compact: false,
      hiddenRows: undefined,
      blocked: [],
      summary: [],
    };
  }
  const { plan } = cleanup;
  const targetWidth = textWidth(viewport, Layout.sizeColumnWidth + 1);
  const summary = reviewSummary(plan.actions);
  const blockedLines =
    plan.blocked.length === 0 ? 0 : BLOCKED_CHROME_LINES + plan.blocked.length * LINES_PER_ROW;
  const availableLines = Math.max(
    1,
    viewport.rows -
      Layout.headerLines -
      Layout.footerLines -
      Layout.screenTitleLines -
      Layout.reviewStatusLines -
      Layout.reviewSpacerLines -
      summary.length -
      blockedLines,
  );
  return {
    ...base,
    status:
      cleanup.phase === CleanupPhase.Running
        ? UiCopy.cleanup.running(
            formatCount(cleanup.results.length),
            formatCount(plan.actions.length),
          )
        : undefined,
    ...fitRows(
      plan.actions.map((action) => actionRow(action, home, targetWidth)),
      availableLines,
    ),
    blocked: plan.blocked.map((item) => ({
      label: UiCopy.cleanup.blockReasons[item.reason],
      target: truncateMiddle(describeTargets(item.paths, home), targetWidth),
      size: padSize(formatByteSize(item.size)),
      color: ColorRole.muted,
    })),
    summary,
  };
}

export function cleanupReportView(state: AppState): CleanupReportView {
  const base = { kind: ScreenKind.CleanupReport, title: UiCopy.cleanup.reportTitle } as const;
  const { cleanup } = state;
  if (cleanup.phase !== CleanupPhase.Finished) {
    return { ...base, summary: [], problemsHeading: undefined, problems: [] };
  }
  const { report } = cleanup;
  const problems = report.results.filter((result) => result.outcome !== OutcomeKind.Done);
  return {
    ...base,
    summary: [
      report.measuredFreeSpaceGain === undefined
        ? UiCopy.cleanup.removed(formatByteSize(report.removedSize))
        : UiCopy.cleanup.measuredGain(formatByteSize(report.measuredFreeSpaceGain)),
      ...(report.movedToTrashSize.isZero()
        ? []
        : [UiCopy.cleanup.trashed(formatByteSize(report.movedToTrashSize))]),
    ],
    problemsHeading: problems.length === 0 ? undefined : UiCopy.cleanup.problems,
    problems: problems.map((result) => ({
      label: [UiCopy.cleanup.outcomes[result.outcome], result.detail]
        .filter((part) => part !== undefined)
        .join(": "),
      target: describeTargets(pathsOf(result.action), state.context.home),
      size: padSize(formatByteSize(result.action.size)),
      color: ColorRole.keep,
    })),
  };
}
