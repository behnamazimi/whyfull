import {
  assertNever,
  BlockReason,
  ByteSize,
  CleanupActionKind,
  OutcomeKind,
  pathsOf,
  SafetyLevel,
  totalSizeOf,
  type AbsolutePath,
  type ActionResult,
  type ApprovedAction,
  type BlockedItem,
  type OwnerToolId,
} from "../../../domain/index.ts";
import { ruleCopy } from "../../copy/rule-copy.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatCount } from "../../format/count-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { ColorRole, Glyph, safetyTone, type Tone } from "../../theme.ts";
import { CleanupPhase, type AppState } from "../state/app-state.ts";
import { ScreenKind } from "../state/screen.ts";
import { trashEntryAfterCleanup } from "../state/trash-offer.ts";
import { isTypingConfirmation } from "../state/selectors.ts";
import { ListEntryKind, type SectionHeader } from "./list-row.ts";
import {
  Layout,
  padSize,
  shareBar,
  sizeBar,
  textWidth,
  truncate,
  truncateMiddle,
  type Viewport,
} from "./layout.ts";

export interface CleanupPlace {
  readonly size: string;
  readonly target: string;
}

/** One kind of item: a rule, or an owner tool covering several rules. */
export interface CleanupItem {
  /** Progress while cleaning runs: done, working or a problem. Blank otherwise. */
  readonly mark: string;
  readonly markColor: ColorRole;
  readonly size: string;
  readonly bar: string;
  readonly heading: string;
  /** Muted text after the heading, such as how many places it covers. */
  readonly note: string;
  readonly places: readonly CleanupPlace[];
  readonly morePlaces: string | undefined;
}

/** Items that get the same treatment, under a header that says what happens to them. */
export interface CleanupSection {
  readonly header: SectionHeader;
  readonly items: readonly CleanupItem[];
}

export interface BlockedRow {
  readonly size: string;
  readonly bar: string;
  readonly title: string;
  readonly reason: string;
}

export interface BlockedSection {
  readonly header: SectionHeader;
  readonly rows: readonly BlockedRow[];
}

export interface TypedConfirmation {
  readonly prompt: string;
  readonly typed: string;
}

export interface CleanupReviewView {
  readonly kind: typeof ScreenKind.CleanupReview;
  readonly title: string;
  /** Muted text after the title: how many kinds of item and how many are left out. */
  readonly aside: string;
  /** How much the cleanup frees right away, shown at the right edge of the title line. */
  readonly freed: string;
  readonly status: string | undefined;
  /** A bar of the actions finished so far, shown beside the status while cleaning runs. */
  readonly progressBar: string | undefined;
  /** Set when deleting high-risk items waits for the person to type a word. */
  readonly confirmation: TypedConfirmation | undefined;
  readonly sections: readonly CleanupSection[];
  readonly hiddenItems: string | undefined;
  readonly blocked: BlockedSection | undefined;
  readonly summary: readonly string[];
}

export interface CleanupRow {
  readonly label: string;
  readonly target: string;
  readonly size: string;
  readonly color: ColorRole;
}

export interface CleanupReportView {
  readonly kind: typeof ScreenKind.CleanupReport;
  readonly title: string;
  readonly summary: readonly string[];
  readonly problemsHeading: string | undefined;
  readonly problems: readonly CleanupRow[];
}

const sectionTone: Readonly<Record<CleanupActionKind, Tone>> = {
  [CleanupActionKind.DeleteHighRisk]: {
    icon: safetyTone[SafetyLevel.Regenerable].icon,
    color: ColorRole.danger,
  },
  [CleanupActionKind.Delete]: safetyTone[SafetyLevel.Regenerable],
  [CleanupActionKind.MoveToTrash]: safetyTone[SafetyLevel.NeedsReview],
  [CleanupActionKind.EmptyTrash]: safetyTone[SafetyLevel.NeedsReview],
  [CleanupActionKind.RunOwnerTool]: safetyTone[SafetyLevel.Regenerable],
};

// Riskiest first, the way the main list puts the cautious groups after the safe one.
const SECTION_ORDER = [
  CleanupActionKind.DeleteHighRisk,
  CleanupActionKind.EmptyTrash,
  CleanupActionKind.Delete,
  CleanupActionKind.MoveToTrash,
  CleanupActionKind.RunOwnerTool,
] as const;

const MOST_PLACES_PER_ITEM = 3;
const SECTION_CHROME_LINES = 2;
const BLOCKED_CHROME_LINES = 2;
const CONFIRMATION_LINES = 2;
const BLOCKED_GUTTER_WIDTH = 6;
const BLOCKED_SEPARATORS_WIDTH = 4;
const REASON_SHARE_OF_ROW = 0.75;

function describeTargets(paths: readonly AbsolutePath[], home: AbsolutePath): string {
  const [first, ...rest] = paths;
  if (first === undefined) return "";
  const more = rest.length === 0 ? "" : UiCopy.cleanup.andMore(formatCount(rest.length));
  return formatPath(first, home) + more;
}

function groupKey(action: ApprovedAction): string {
  switch (action.kind) {
    case CleanupActionKind.RunOwnerTool:
      return `${action.kind}:${action.tool}`;
    case CleanupActionKind.Delete:
    case CleanupActionKind.MoveToTrash:
    case CleanupActionKind.EmptyTrash:
      return `${action.kind}:${action.rule.id}`;
    case CleanupActionKind.DeleteHighRisk:
      return action.kind;
    default:
      return assertNever(action);
  }
}

function groupName(action: ApprovedAction): string {
  switch (action.kind) {
    case CleanupActionKind.RunOwnerTool:
      return UiCopy.cleanup.tools[action.tool];
    case CleanupActionKind.Delete:
    case CleanupActionKind.MoveToTrash:
    case CleanupActionKind.EmptyTrash:
      return ruleCopy[action.rule.id].title;
    case CleanupActionKind.DeleteHighRisk:
      return UiCopy.cleanup.highRiskItems;
    default:
      return assertNever(action);
  }
}

interface Progress {
  readonly finished: ReadonlySet<ApprovedAction>;
  readonly problems: ReadonlySet<ApprovedAction>;
  readonly current: ApprovedAction | undefined;
}

const noProgress: Progress = { finished: new Set(), problems: new Set(), current: undefined };

function markOf(
  actions: readonly ApprovedAction[],
  progress: Progress,
): Pick<CleanupItem, "mark" | "markColor"> {
  if (actions.some((action) => progress.problems.has(action))) {
    return { mark: Glyph.problem, markColor: ColorRole.danger };
  }
  if (actions.every((action) => progress.finished.has(action))) {
    return { mark: Glyph.done, markColor: ColorRole.safe };
  }
  if (progress.current !== undefined && actions.includes(progress.current)) {
    return { mark: Glyph.working, markColor: ColorRole.caution };
  }
  return { mark: " ", markColor: ColorRole.muted };
}

function toItem(
  actions: readonly ApprovedAction[],
  largest: ByteSize,
  home: AbsolutePath,
  targetWidth: number,
  shownPlaces: number,
  progress: Progress,
): CleanupItem | undefined {
  const [first] = actions;
  if (first === undefined) return undefined;
  const places = actions.map((action) => ({
    size: padSize(formatByteSize(action.size)),
    target: truncateMiddle(describeTargets(pathsOf(action), home), targetWidth),
  }));
  const hidden = places.length - Math.min(shownPlaces, places.length);
  const total = totalSizeOf(actions);
  return {
    ...markOf(actions, progress),
    size: padSize(formatByteSize(total)),
    bar: sizeBar(total, largest),
    heading: groupName(first),
    note: places.length > 1 ? UiCopy.cleanup.groupPlaces(formatCount(places.length)) : "",
    places: places.slice(0, shownPlaces),
    morePlaces: hidden === 0 ? undefined : UiCopy.cleanup.morePlaces(formatCount(hidden)),
  };
}

function linesForItem(placeCount: number, shownPlaces: number): number {
  const shown = Math.min(shownPlaces, placeCount);
  const moreLine = placeCount > shown && shown > 0 ? 1 : 0;
  return 1 + shown + moreLine;
}

type Kinds = readonly (readonly (readonly ApprovedAction[])[])[];

function linesForSections(sections: Kinds, shownPlaces: number): number {
  return sections.reduce(
    (total, items) =>
      total +
      SECTION_CHROME_LINES +
      items.reduce((sum, item) => sum + linesForItem(item.length, shownPlaces), 0),
    0,
  );
}

/** Shows as many places per item as fit, then drops whole items from the end if even none fit. */
function fitSections(
  sections: Kinds,
  availableLines: number,
): { readonly shownPlaces: number; readonly itemsShown: number } {
  const itemCount = sections.reduce((sum, items) => sum + items.length, 0);
  for (let shown = MOST_PLACES_PER_ITEM; shown >= 0; shown -= 1) {
    if (linesForSections(sections, shown) <= availableLines) {
      return { shownPlaces: shown, itemsShown: itemCount };
    }
  }
  let itemsShown = 0;
  let lines = 0;
  for (const items of sections) {
    lines += SECTION_CHROME_LINES;
    const fits = Math.min(items.length, Math.max(0, availableLines - lines));
    itemsShown += fits;
    lines += fits;
    if (fits < items.length) break;
  }
  return { shownPlaces: 0, itemsShown: Math.max(1, itemsShown) };
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
    ...summaryLine(CleanupActionKind.DeleteHighRisk, UiCopy.cleanup.willDeleteChosen),
    ...summaryLine(CleanupActionKind.EmptyTrash, UiCopy.cleanup.willEmptyTrash),
    ...summaryLine(CleanupActionKind.Delete, UiCopy.cleanup.willFree),
    ...summaryLine(CleanupActionKind.MoveToTrash, UiCopy.cleanup.willTrash),
    ...summaryLine(CleanupActionKind.RunOwnerTool, UiCopy.cleanup.toolsMayFree),
    ...ownerToolsIn(actions).map((tool) => UiCopy.cleanup.toolNotes[tool]),
  ];
}

function ownerToolsIn(actions: readonly ApprovedAction[]): readonly OwnerToolId[] {
  const tools = actions.flatMap((action) =>
    action.kind === CleanupActionKind.RunOwnerTool ? [action.tool] : [],
  );
  return [...new Set(tools)];
}

function progressOf(cleanup: AppState["cleanup"]): Progress {
  if (cleanup.phase !== CleanupPhase.Running) return noProgress;
  return {
    finished: new Set(cleanup.results.map((result) => result.action)),
    problems: new Set(
      cleanup.results
        .filter((result) => result.outcome !== OutcomeKind.Done)
        .map((result) => result.action),
    ),
    current: cleanup.plan.actions[cleanup.results.length],
  };
}

function blockedSection(
  separate: readonly BlockedItem[],
  home: AbsolutePath,
  viewport: Viewport,
): BlockedSection | undefined {
  if (separate.length === 0) return undefined;
  const blocked = mergedBlocked(separate);
  const largest = ByteSize.largestOf(blocked.map((item) => item.size));
  const room = textWidth(
    viewport,
    BLOCKED_GUTTER_WIDTH + BLOCKED_SEPARATORS_WIDTH + Layout.sizeColumnWidth + Layout.barWidth,
  );
  const reasons = blocked.map((item) =>
    item.reason === BlockReason.AppRunning && item.detail !== undefined
      ? UiCopy.cleanup.appRunning(item.detail)
      : UiCopy.cleanup.blockReasons[item.reason],
  );
  const reasonWidth = Math.min(
    Math.max(...reasons.map((reason) => reason.length)),
    Math.floor(room * REASON_SHARE_OF_ROW),
  );
  const titleWidth = Math.max(Layout.minimumTextWidth, room - reasonWidth);
  return {
    header: {
      kind: ListEntryKind.Header,
      icon: safetyTone[SafetyLevel.Protected].icon,
      color: safetyTone[SafetyLevel.Protected].color,
      title: UiCopy.cleanup.leftOut.title,
      hint: UiCopy.cleanup.leftOut.hint,
      total: formatByteSize(totalSizeOf(blocked)),
    },
    rows: blocked.map((item, index) => ({
      size: padSize(formatByteSize(item.size)),
      bar: sizeBar(item.size, largest),
      title: truncateMiddle(
        item.rule === undefined
          ? describeTargets(item.paths, home)
          : ruleCopy[item.rule.id].title +
              (item.paths.length > 1
                ? UiCopy.cleanup.mergedPlaces(formatCount(item.paths.length))
                : ""),
        titleWidth,
      ),
      reason: truncate(reasons[index] ?? "", reasonWidth),
    })),
  };
}

function freedText(
  freedNow: readonly ApprovedAction[],
  toolActions: readonly ApprovedAction[],
  trashActions: readonly ApprovedAction[],
): string {
  const now = freedNow.length === 0 ? undefined : formatByteSize(totalSizeOf(freedNow));
  const tools = toolActions.length === 0 ? undefined : formatByteSize(totalSizeOf(toolActions));
  const spaceBack =
    now !== undefined && tools !== undefined
      ? UiCopy.cleanup.toFreeWithTools(now, tools)
      : now !== undefined
        ? UiCopy.cleanup.toFree(now)
        : tools === undefined
          ? ""
          : UiCopy.cleanup.toolsOnly(tools);
  if (trashActions.length === 0) return spaceBack;
  const trashed = UiCopy.cleanup.toTrash(formatByteSize(totalSizeOf(trashActions)));
  return spaceBack === "" ? trashed : `${spaceBack}${Glyph.separator}${trashed}`;
}

/** The same item blocked for the same reason in several places reads as one line. */
function mergedBlocked(blocked: readonly BlockedItem[]): readonly BlockedItem[] {
  const keyOf = (item: BlockedItem): string =>
    [
      item.rule?.id ?? item.paths.map((path) => path.toString()).join(),
      item.reason,
      item.detail,
    ].join("|");
  return [...Map.groupBy(blocked, keyOf).values()].flatMap((group): BlockedItem[] => {
    const [first] = group;
    if (first === undefined) return [];
    return [
      {
        ...first,
        paths: group.flatMap((item) => item.paths),
        size: totalSizeOf(group),
      },
    ];
  });
}

export function cleanupReviewView(state: AppState, viewport: Viewport): CleanupReviewView {
  const { cleanup } = state;
  const home = state.context.home;
  const base = { kind: ScreenKind.CleanupReview, title: UiCopy.cleanup.reviewTitle } as const;
  if (cleanup.phase !== CleanupPhase.Reviewing && cleanup.phase !== CleanupPhase.Running) {
    return {
      ...base,
      aside: "",
      freed: "",
      status: UiCopy.cleanup.planning,
      progressBar: undefined,
      confirmation: undefined,
      sections: [],
      hiddenItems: undefined,
      blocked: undefined,
      summary: [],
    };
  }
  const { plan } = cleanup;
  const targetWidth = textWidth(viewport, Layout.sizeColumnWidth + Layout.reviewIndentWidth);
  const summary = reviewSummary(plan.actions);
  const confirmation: TypedConfirmation | undefined =
    isTypingConfirmation(state) && cleanup.phase === CleanupPhase.Reviewing
      ? {
          prompt: UiCopy.cleanup.typeToConfirm(UiCopy.cleanup.confirmationWord),
          typed: cleanup.typed,
        }
      : undefined;
  const blocked = blockedSection(plan.blocked, home, viewport);
  const blockedLines = blocked === undefined ? 0 : BLOCKED_CHROME_LINES + blocked.rows.length;
  const availableLines = Math.max(
    1,
    viewport.rows -
      Layout.reviewHeadLines -
      Layout.reviewStatusLines -
      Layout.reviewSpacerLines -
      summary.length -
      blockedLines -
      (confirmation === undefined ? 0 : CONFIRMATION_LINES),
  );
  const byKind = Map.groupBy(
    Map.groupBy(plan.actions, groupKey)
      .values()
      .toArray()
      .sort((left, right) => ByteSize.largestFirst(totalSizeOf(left), totalSizeOf(right))),
    (group) => group[0]?.kind,
  );
  const kinds = SECTION_ORDER.filter((kind) => byKind.has(kind));
  const grouped = kinds.map((kind) => byKind.get(kind) ?? []);
  const { shownPlaces, itemsShown } = fitSections(grouped, availableLines);
  const largest = ByteSize.largestOf(plan.actions.map((action) => action.size));
  const progress = progressOf(cleanup);
  let remaining = itemsShown;
  const sections = kinds.flatMap((kind): CleanupSection[] => {
    const groups = (byKind.get(kind) ?? []).slice(0, remaining);
    remaining -= groups.length;
    const items = groups
      .map((actions) => toItem(actions, largest, home, targetWidth, shownPlaces, progress))
      .filter((item) => item !== undefined);
    if (items.length === 0) return [];
    const all = (byKind.get(kind) ?? []).flat();
    const tone = sectionTone[kind];
    return [
      {
        header: {
          kind: ListEntryKind.Header,
          icon: tone.icon,
          color: tone.color,
          title: UiCopy.cleanup.sections[kind].title,
          hint: UiCopy.cleanup.sections[kind].hint,
          total: formatByteSize(totalSizeOf(all)),
        },
        items,
      },
    ];
  });
  const itemCount = grouped.reduce((sum, items) => sum + items.length, 0);
  const toolActions = plan.actions.filter(
    (action) => action.kind === CleanupActionKind.RunOwnerTool,
  );
  const freedNow = plan.actions.filter(
    (action) =>
      action.kind === CleanupActionKind.Delete ||
      action.kind === CleanupActionKind.EmptyTrash ||
      action.kind === CleanupActionKind.DeleteHighRisk,
  );
  const trashActions = plan.actions.filter(
    (action) => action.kind === CleanupActionKind.MoveToTrash,
  );
  return {
    ...base,
    aside: UiCopy.cleanup.aside(
      itemCount,
      plan.blocked.length,
      formatByteSize(totalSizeOf(plan.blocked)),
    ),
    freed: freedText(freedNow, toolActions, trashActions),
    status:
      cleanup.phase === CleanupPhase.Running
        ? UiCopy.cleanup.running(
            formatCount(cleanup.results.length),
            formatCount(plan.actions.length),
          )
        : undefined,
    progressBar:
      cleanup.phase === CleanupPhase.Running
        ? shareBar(cleanup.results.length / plan.actions.length, Layout.progressBarWidth)
        : undefined,
    confirmation,
    sections,
    hiddenItems:
      itemsShown < itemCount ? UiCopy.cleanup.hiddenGroups(itemCount - itemsShown) : undefined,
    blocked,
    summary,
  };
}

const PROBLEM_PART_SEPARATOR = ": ";
const OUTCOME_SEPARATOR = "; ";

function problemLabel(result: ActionResult): string {
  const outcome = UiCopy.cleanup.outcomes[result.outcome];
  const remaining = result.action.size.minusOrZero(result.freed);
  const summary =
    result.outcome === OutcomeKind.PartlyDeleted
      ? outcome + OUTCOME_SEPARATOR + UiCopy.cleanup.stillThere(formatByteSize(remaining))
      : outcome;
  const explanation =
    result.problem === undefined ? result.detail : UiCopy.cleanup.toolProblems[result.problem];
  return [summary, explanation].filter((part) => part !== undefined).join(PROBLEM_PART_SEPARATOR);
}

export function cleanupReportView(state: AppState): CleanupReportView {
  const base = { kind: ScreenKind.CleanupReport, title: UiCopy.cleanup.reportTitle } as const;
  const { cleanup } = state;
  if (cleanup.phase !== CleanupPhase.Finished) {
    return { ...base, summary: [], problemsHeading: undefined, problems: [] };
  }
  const { report } = cleanup;
  const problems = report.results.filter((result) => result.outcome !== OutcomeKind.Done);
  const cleanedSomething = report.results.some(
    (result) => result.outcome === OutcomeKind.Done || result.outcome === OutcomeKind.PartlyDeleted,
  );
  return {
    ...base,
    summary: [
      !cleanedSomething
        ? UiCopy.cleanup.nothingCleaned
        : report.measuredFreeSpaceGain === undefined
          ? UiCopy.cleanup.removed(formatByteSize(report.removedSize))
          : UiCopy.cleanup.measuredGain(formatByteSize(report.measuredFreeSpaceGain)),
      ...report.results
        .filter(
          (result) =>
            result.action.kind === CleanupActionKind.RunOwnerTool &&
            result.outcome === OutcomeKind.Done &&
            result.freed.isZero(),
        )
        .map((result) =>
          UiCopy.cleanup.nothingFreed(describeTargets(pathsOf(result.action), state.context.home)),
        ),
      ...(report.highRiskRemovedSize.isZero()
        ? []
        : [UiCopy.cleanup.highRiskRemoved(formatByteSize(report.highRiskRemovedSize))]),
      ...(report.movedToTrashSize.isZero()
        ? []
        : [UiCopy.cleanup.trashed(formatByteSize(report.movedToTrashSize))]),
      ...(trashEntryAfterCleanup(state) === undefined ? [] : [UiCopy.cleanup.emptyTrashOffer]),
    ],
    problemsHeading: problems.length === 0 ? undefined : UiCopy.cleanup.problems,
    problems: problems.map((result) => ({
      label: problemLabel(result),
      target: describeTargets(pathsOf(result.action), state.context.home),
      size: padSize(formatByteSize(result.action.size)),
      color: ColorRole.danger,
    })),
  };
}
