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
import { Palette } from "../../theme.ts";
import { CleanupPhase, type AppState } from "../state/app-state.ts";
import { ScreenKind } from "../state/screen.ts";
import { padSize } from "./layout.ts";

export interface CleanupRow {
  readonly label: string;
  readonly target: string;
  readonly size: string;
  readonly color: string;
}

export interface CleanupReviewView {
  readonly kind: typeof ScreenKind.CleanupReview;
  readonly title: string;
  readonly status: string | undefined;
  readonly rows: readonly CleanupRow[];
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

const actionColor: Readonly<Record<CleanupActionKind, string>> = {
  [CleanupActionKind.Delete]: Palette.safe,
  [CleanupActionKind.MoveToTrash]: Palette.caution,
  [CleanupActionKind.RunOwnerTool]: Palette.safe,
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

function actionRow(action: CleanupAction, home: AbsolutePath): CleanupRow {
  return {
    label: actionLabel(action),
    target: describeTargets(pathsOf(action), home),
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

export function cleanupReviewView(state: AppState): CleanupReviewView {
  const { cleanup } = state;
  const home = state.context.home;
  const base = {
    kind: ScreenKind.CleanupReview,
    title: UiCopy.cleanup.reviewTitle,
    blockedHeading: UiCopy.cleanup.notIncluded,
  } as const;
  if (cleanup.phase !== CleanupPhase.Reviewing && cleanup.phase !== CleanupPhase.Running) {
    return { ...base, status: UiCopy.cleanup.planning, rows: [], blocked: [], summary: [] };
  }
  const { plan } = cleanup;
  return {
    ...base,
    status:
      cleanup.phase === CleanupPhase.Running
        ? UiCopy.cleanup.running(
            formatCount(cleanup.results.length),
            formatCount(plan.actions.length),
          )
        : undefined,
    rows: plan.actions.map((action) => actionRow(action, home)),
    blocked: plan.blocked.map((item) => ({
      label: UiCopy.cleanup.blockReasons[item.reason],
      target: describeTargets(item.paths, home),
      size: padSize(formatByteSize(item.size)),
      color: Palette.muted,
    })),
    summary: reviewSummary(plan.actions),
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
      color: Palette.keep,
    })),
  };
}
