import {
  ByteSize,
  CleanupActionKind,
  OutcomeKind,
  pathsOf,
  totalSizeOf,
  type AbsolutePath,
  type ApprovedAction,
} from "../../../domain/index.ts";
import { ruleCopy } from "../../copy/rule-copy.ts";
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

export interface CleanupPlace {
  readonly size: string;
  readonly target: string;
}

export interface CleanupGroup {
  readonly heading: string;
  readonly size: string;
  readonly consequence: string;
  readonly color: ColorRole;
  readonly places: readonly CleanupPlace[];
  readonly morePlaces: string | undefined;
}

export interface CleanupReviewView {
  readonly kind: typeof ScreenKind.CleanupReview;
  readonly title: string;
  readonly status: string | undefined;
  readonly groups: readonly CleanupGroup[];
  readonly hiddenGroups: string | undefined;
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

const MOST_PLACES_PER_GROUP = 3;
const GROUP_HEADER_LINES = 2;
const GROUP_GAP_LINES = 1;
const BLOCKED_CHROME_LINES = 2;
const BLOCKED_LINES_PER_ROW = 2;

function describeTargets(paths: readonly AbsolutePath[], home: AbsolutePath): string {
  const [first, ...rest] = paths;
  if (first === undefined) return "";
  const more = rest.length === 0 ? "" : UiCopy.cleanup.andMore(formatCount(rest.length));
  return formatPath(first, home) + more;
}

function groupKey(action: ApprovedAction): string {
  return action.kind === CleanupActionKind.RunOwnerTool
    ? `${action.kind}:${action.tool}`
    : `${action.kind}:${action.rule.id}`;
}

function groupHeading(action: ApprovedAction, placeCount: number): string {
  const name =
    action.kind === CleanupActionKind.RunOwnerTool
      ? UiCopy.cleanup.tools[action.tool]
      : ruleCopy[action.rule.id].title;
  return placeCount > 1 ? name + UiCopy.cleanup.groupPlaces(formatCount(placeCount)) : name;
}

function toGroup(
  actions: readonly ApprovedAction[],
  home: AbsolutePath,
  targetWidth: number,
  shownPlaces: number,
): CleanupGroup | undefined {
  const [first] = actions;
  if (first === undefined) return undefined;
  const places = actions.map((action) => ({
    size: padSize(formatByteSize(action.size)),
    target: truncateMiddle(describeTargets(pathsOf(action), home), targetWidth),
  }));
  const hidden = places.length - Math.min(shownPlaces, places.length);
  return {
    heading: groupHeading(first, places.length),
    size: padSize(formatByteSize(totalSizeOf(actions))),
    consequence: UiCopy.cleanup.consequences[first.kind],
    color: actionColor[first.kind],
    places: places.slice(0, shownPlaces),
    morePlaces: hidden === 0 ? undefined : UiCopy.cleanup.morePlaces(formatCount(hidden)),
  };
}

function linesForGroup(placeCount: number, shownPlaces: number): number {
  const shown = Math.min(shownPlaces, placeCount);
  const moreLine = placeCount > shown && shown > 0 ? 1 : 0;
  return GROUP_HEADER_LINES + shown + moreLine + GROUP_GAP_LINES;
}

function fitGroups(
  grouped: readonly (readonly ApprovedAction[])[],
  availableLines: number,
): { readonly shownPlaces: number; readonly groupCount: number } {
  for (let shown = MOST_PLACES_PER_GROUP; shown >= 0; shown -= 1) {
    const total = grouped.reduce((sum, group) => sum + linesForGroup(group.length, shown), 0);
    if (total <= availableLines) return { shownPlaces: shown, groupCount: grouped.length };
  }
  const perGroup = linesForGroup(0, 0);
  return {
    shownPlaces: 0,
    groupCount: Math.max(1, Math.floor((availableLines - 1) / perGroup)),
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
      groups: [],
      hiddenGroups: undefined,
      blocked: [],
      summary: [],
    };
  }
  const { plan } = cleanup;
  const targetWidth = textWidth(viewport, Layout.sizeColumnWidth + Layout.reviewIndentWidth);
  const summary = reviewSummary(plan.actions);
  const blockedLines =
    plan.blocked.length === 0
      ? 0
      : BLOCKED_CHROME_LINES + plan.blocked.length * BLOCKED_LINES_PER_ROW;
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
  const grouped = [...Map.groupBy(plan.actions, groupKey).values()].sort((left, right) =>
    ByteSize.largestFirst(totalSizeOf(left), totalSizeOf(right)),
  );
  const { shownPlaces, groupCount } = fitGroups(grouped, availableLines);
  const groups = grouped
    .slice(0, groupCount)
    .map((actions) => toGroup(actions, home, targetWidth, shownPlaces))
    .filter((group) => group !== undefined);
  return {
    ...base,
    status:
      cleanup.phase === CleanupPhase.Running
        ? UiCopy.cleanup.running(
            formatCount(cleanup.results.length),
            formatCount(plan.actions.length),
          )
        : undefined,
    groups,
    hiddenGroups:
      groupCount < grouped.length
        ? UiCopy.cleanup.hiddenGroups(formatCount(grouped.length - groupCount))
        : undefined,
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
