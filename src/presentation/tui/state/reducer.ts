import { DiagnosisUpdateKind, type DiagnosisUpdate } from "../../../application/index.ts";
import {
  assertNever,
  FindingGroup,
  findingGroup,
  FindingKind,
  totalSizeOf,
  type AbsolutePath,
  type Finding,
} from "../../../domain/index.ts";
import { isCleanableByWhyfull } from "../../copy/rule-labels.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatCount } from "../../format/count-format.ts";
import { UserAction } from "../../keymap.ts";
import { cleanupSummaryText } from "../../report/cleanup-summary.ts";
import { AppEventKind, EffectKind, type AppEvent } from "./app-event.ts";
import { CleanupPhase, ScanStatus, type AppState, type ScanState } from "./app-state.ts";
import {
  confirmCleanup,
  eraseConfirmation,
  toCartEntry,
  finishCleanup,
  leaveCleanupReview,
  reviewCleanup,
  toggleCleanup,
  typeConfirmation,
} from "./cleanup-reducer.ts";
import { usageBreakdownOf } from "../view-models/disk-breakdown.ts";
import { helpLineCount } from "../view-models/simple-views.ts";
import { pressDialogKey, toggleHighRiskMode } from "./high-risk-reducer.ts";
import { nextFilter } from "./finding-filter.ts";
import { initialScreen, isDialog, ScreenKind, Tab, tabOf, type Screen } from "./screen.ts";
import {
  restartScan,
  stay,
  withEffect,
  withNotice,
  withScreen,
  type Transition,
} from "./transition.ts";
import {
  assistantPromptText,
  findingAt,
  findingsOf,
  FolderEntryKind,
  folderAt,
  folderEntries,
  locationPathsOf,
} from "./selectors.ts";

const ONE_ROW = 1;
const PAGE_SIZE = 10;
/** The free-space row that ends the disk list, which the breakdown's shares don't include. */
const FREE_SPACE_ROW = 1;

export type { Transition } from "./transition.ts";

const clampedSelection = (selected: number, delta: number, count: number): number =>
  count === 0 ? 0 : Math.min(Math.max(selected + delta, 0), count - 1);

const selectionDelta = (action: UserAction): number | undefined => {
  switch (action) {
    case UserAction.MoveUp:
      return -ONE_ROW;
    case UserAction.MoveDown:
      return ONE_ROW;
    case UserAction.PageUp:
      return -PAGE_SIZE;
    case UserAction.PageDown:
      return PAGE_SIZE;
    case UserAction.Open:
    case UserAction.Back:
    case UserAction.ShowCleanup:
    case UserAction.BrowseFolders:
    case UserAction.AskAssistant:
    case UserAction.ShowDiskOverview:
    case UserAction.ScanWholeDisk:
    case UserAction.FixPermissions:
    case UserAction.ToggleCleanup:
    case UserAction.SelectAllSafe:
    case UserAction.ConfirmCleanup:
    case UserAction.ReviewCleanup:
    case UserAction.ShowGrowth:
    case UserAction.CopySummary:
    case UserAction.CycleFilter:
    case UserAction.HighRiskMode:
    case UserAction.Help:
    case UserAction.Quit:
      return undefined;
  }
};

function rowCount(state: AppState, screen: Screen): number {
  switch (screen.kind) {
    case ScreenKind.Diagnosis:
      return findingsOf(state).length;
    case ScreenKind.FindingDetail: {
      const finding = findingAt(state, screen.findingIndex);
      return finding === undefined ? 0 : locationPathsOf(finding).length;
    }
    case ScreenKind.Folders: {
      const folder = folderAt(state, screen.folder);
      return folder === undefined ? 0 : folderEntries(state, folder).length;
    }
    case ScreenKind.Help:
      return helpLineCount();
    case ScreenKind.DiskOverview: {
      const breakdown = usageBreakdownOf(state);
      return breakdown === undefined ? 0 : breakdown.shares.length + FREE_SPACE_ROW;
    }
    case ScreenKind.Growth:
      return state.growth?.grownFolders.length ?? 0;
    case ScreenKind.PromptPreview:
    case ScreenKind.PermissionGuide:
    case ScreenKind.CleanupReview:
    case ScreenKind.CleanupReport:
    case ScreenKind.HighRiskDialog:
      return 0;
    default:
      return assertNever(screen);
  }
}

function withSelection(screen: Screen, selected: number): Screen {
  switch (screen.kind) {
    case ScreenKind.Diagnosis:
    case ScreenKind.FindingDetail:
    case ScreenKind.Folders:
    case ScreenKind.Help:
    case ScreenKind.DiskOverview:
    case ScreenKind.Growth:
      return { ...screen, selected };
    case ScreenKind.PromptPreview:
    case ScreenKind.PermissionGuide:
    case ScreenKind.CleanupReview:
    case ScreenKind.CleanupReport:
    case ScreenKind.HighRiskDialog:
      return screen;
    default:
      return assertNever(screen);
  }
}

const selectedIndexOf = (screen: Screen): number =>
  screen.kind === ScreenKind.Diagnosis ||
  screen.kind === ScreenKind.FindingDetail ||
  screen.kind === ScreenKind.Folders ||
  screen.kind === ScreenKind.Help ||
  screen.kind === ScreenKind.DiskOverview ||
  screen.kind === ScreenKind.Growth
    ? screen.selected
    : 0;

function openFolder(state: AppState, folder: AbsolutePath, previous: Screen): Transition {
  if (state.scan.status !== ScanStatus.Completed)
    return withNotice(state, UiCopy.notices.waitForScan);
  return withScreen(state, { kind: ScreenKind.Folders, folder, selected: 0, previous });
}

function askAssistant(state: AppState, path: AbsolutePath | undefined): Transition {
  if (state.scan.status !== ScanStatus.Completed)
    return withNotice(state, UiCopy.notices.waitForScan);
  const text = path === undefined ? undefined : assistantPromptText(state, path);
  if (text === undefined) return withNotice(state, UiCopy.notices.nothingToAskAbout);
  return withScreen(state, { kind: ScreenKind.PromptPreview, text, previous: state.screen });
}

function selectedPath(state: AppState): AbsolutePath | undefined {
  const { screen } = state;
  switch (screen.kind) {
    case ScreenKind.Diagnosis: {
      const finding = findingAt(state, screen.selected);
      return finding === undefined ? undefined : locationPathsOf(finding)[0];
    }
    case ScreenKind.FindingDetail: {
      const finding = findingAt(state, screen.findingIndex);
      return finding === undefined ? undefined : locationPathsOf(finding)[screen.selected];
    }
    case ScreenKind.Folders: {
      const folder = folderAt(state, screen.folder);
      const entry =
        folder === undefined ? undefined : folderEntries(state, folder)[screen.selected];
      return entry?.path ?? screen.folder;
    }
    case ScreenKind.Growth:
      return state.growth?.grownFolders[screen.selected]?.path;
    case ScreenKind.PromptPreview:
    case ScreenKind.Help:
    case ScreenKind.DiskOverview:
    case ScreenKind.PermissionGuide:
    case ScreenKind.CleanupReview:
    case ScreenKind.CleanupReport:
    case ScreenKind.HighRiskDialog:
      return undefined;
    default:
      return assertNever(screen);
  }
}

function open(state: AppState): Transition {
  const { screen } = state;
  switch (screen.kind) {
    case ScreenKind.Diagnosis: {
      const finding = findingAt(state, screen.selected);
      if (finding === undefined) return stay(state);
      if (finding.kind === FindingKind.UnexplainedFolder) {
        return openFolder(state, finding.path, screen);
      }
      return withScreen(state, {
        kind: ScreenKind.FindingDetail,
        findingIndex: screen.selected,
        selected: 0,
        previous: screen,
      });
    }
    case ScreenKind.FindingDetail: {
      const path = selectedPath(state);
      if (path === undefined) return stay(state);
      const folder = folderAt(state, path) === undefined ? path.parent : path;
      return folder === undefined ? stay(state) : openFolder(state, folder, screen);
    }
    case ScreenKind.Folders: {
      const folder = folderAt(state, screen.folder);
      const entry =
        folder === undefined ? undefined : folderEntries(state, folder)[screen.selected];
      if (entry?.kind !== FolderEntryKind.Folder) return stay(state);
      return openFolder(state, entry.path, screen);
    }
    case ScreenKind.PromptPreview:
      return withEffect(
        { ...state, screen: screen.previous },
        { kind: EffectKind.CopyToClipboard, text: screen.text },
      );
    case ScreenKind.Help:
      return withScreen(state, screen.previous);
    case ScreenKind.DiskOverview:
      return stay(state);
    case ScreenKind.PermissionGuide:
      return withEffect(
        { ...state, screen: screen.previous },
        { kind: EffectKind.OpenPermissionSettings },
      );
    case ScreenKind.CleanupReview:
      return stay(state);
    case ScreenKind.CleanupReport:
      return finishCleanup(state);
    case ScreenKind.Growth: {
      const path = selectedPath(state);
      return path === undefined ? stay(state) : openFolder(state, path, screen);
    }
    case ScreenKind.HighRiskDialog:
      return stay(state);
    default:
      return assertNever(screen);
  }
}

function scanWholeDisk(state: AppState): Transition {
  const { wholeDiskScope } = state.context;
  if (wholeDiskScope === undefined || state.scope.kind === wholeDiskScope.kind) return stay(state);
  return restartScan({ ...state, cart: new Map() }, wholeDiskScope);
}

function back(state: AppState): Transition {
  const { screen } = state;
  switch (screen.kind) {
    case ScreenKind.Diagnosis:
      return withNotice(state, UiCopy.notices.quitHint);
    case ScreenKind.CleanupReview:
      return leaveCleanupReview(state, screen.previous);
    case ScreenKind.CleanupReport:
      return finishCleanup(state);
    case ScreenKind.FindingDetail:
    case ScreenKind.Folders:
    case ScreenKind.PromptPreview:
    case ScreenKind.Help:
    case ScreenKind.DiskOverview:
    case ScreenKind.PermissionGuide:
    case ScreenKind.Growth:
    case ScreenKind.HighRiskDialog:
      return withScreen(state, screen.previous);
  }
}

function confirmOnScreen(state: AppState): Transition {
  switch (state.screen.kind) {
    case ScreenKind.CleanupReview:
      return confirmCleanup(state);
    case ScreenKind.HighRiskDialog:
      return stay(state);
    case ScreenKind.Diagnosis:
    case ScreenKind.FindingDetail:
    case ScreenKind.Folders:
    case ScreenKind.PromptPreview:
    case ScreenKind.Help:
    case ScreenKind.DiskOverview:
    case ScreenKind.PermissionGuide:
    case ScreenKind.CleanupReport:
    case ScreenKind.Growth:
      return stay(state);
  }
}

function copySummary(state: AppState): Transition {
  const { cleanup } = state;
  if (state.screen.kind !== ScreenKind.CleanupReport || cleanup.phase !== CleanupPhase.Finished) {
    return withNotice(state, UiCopy.notices.summaryAfterCleanup);
  }
  const text = cleanupSummaryText(cleanup.report);
  return text === undefined
    ? withNotice(state, UiCopy.notices.nothingToShare)
    : withEffect(state, { kind: EffectKind.CopyToClipboard, text });
}

function cycleFilter(state: AppState): Transition {
  if (state.screen.kind !== ScreenKind.Diagnosis) return stay(state);
  return stay({
    ...state,
    findingFilter: nextFilter(state.findingFilter, state.scan.findings),
    screen: { ...state.screen, selected: 0 },
  });
}

/** Each tab starts from its own first screen. Going back from one returns to Cleanup. */
function showTab(state: AppState, tab: Tab): Transition {
  const { screen } = state;
  if (isDialog(screen)) return stay(state);
  switch (tab) {
    case Tab.Cleanup:
      if (screen.kind === ScreenKind.Diagnosis) return stay(state);
      return withScreen(
        state,
        screen.kind === ScreenKind.FindingDetail ? screen.previous : initialScreen,
      );
    case Tab.Folders:
      return screen.kind === ScreenKind.Folders && screen.folder.equals(state.scope.root)
        ? stay(state)
        : openFolder(state, state.scope.root, initialScreen);
    case Tab.Disk:
      return tabOf(screen) === Tab.Disk
        ? stay(state)
        : withScreen(state, {
            kind: ScreenKind.DiskOverview,
            previous: initialScreen,
            selected: 0,
          });
    case Tab.Grew:
      return tabOf(screen) === Tab.Grew
        ? stay(state)
        : withScreen(state, { kind: ScreenKind.Growth, previous: initialScreen, selected: 0 });
  }
}

/** Adds every item whyfull can clean and that comes back on its own, including ones found so far. */
function selectAllSafe(state: AppState): Transition {
  const cart = new Map(state.cart);
  const safe = state.scan.findings
    .filter(
      (finding): finding is Extract<Finding, { readonly kind: typeof FindingKind.KnownItem }> =>
        finding.kind === FindingKind.KnownItem && findingGroup(finding) === FindingGroup.Safe,
    )
    .flatMap((finding) => finding.locations)
    .filter((item) => isCleanableByWhyfull(item.rule));
  if (safe.length === 0) return withNotice(state, UiCopy.notices.nothingSafeYet);
  for (const item of safe) cart.set(item.path.toString(), toCartEntry(item));
  return withNotice(
    { ...state, cart },
    UiCopy.notices.selectedSafe(formatCount(safe.length), formatByteSize(totalSizeOf(safe))),
  );
}

/** While a dialog is open, only the keys it shows do anything. */
const DIALOG_ACTIONS: readonly UserAction[] = [
  UserAction.MoveUp,
  UserAction.MoveDown,
  UserAction.PageUp,
  UserAction.PageDown,
  UserAction.Open,
  UserAction.Back,
  UserAction.ConfirmCleanup,
  UserAction.CopySummary,
  UserAction.HighRiskMode,
  UserAction.Help,
  UserAction.Quit,
];

function reduceAction(state: AppState, action: UserAction): Transition {
  if (isDialog(state.screen) && !DIALOG_ACTIONS.includes(action)) return stay(state);
  const delta = selectionDelta(action);
  if (delta !== undefined) {
    const count = rowCount(state, state.screen);
    const selected = clampedSelection(selectedIndexOf(state.screen), delta, count);
    return withScreen(state, withSelection(state.screen, selected));
  }
  switch (action) {
    case UserAction.Open:
      return open(state);
    case UserAction.Back:
      return back(state);
    case UserAction.ShowCleanup:
      return showTab(state, Tab.Cleanup);
    case UserAction.BrowseFolders:
      return showTab(state, Tab.Folders);
    case UserAction.AskAssistant:
      return askAssistant(state, selectedPath(state));
    case UserAction.ShowDiskOverview:
      return showTab(state, Tab.Disk);
    case UserAction.ScanWholeDisk:
      return scanWholeDisk(state);
    case UserAction.FixPermissions:
      return withScreen(state, { kind: ScreenKind.PermissionGuide, previous: state.screen });
    case UserAction.ToggleCleanup:
      return toggleCleanup(state);
    case UserAction.SelectAllSafe:
      return selectAllSafe(state);
    case UserAction.ConfirmCleanup:
      return confirmOnScreen(state);
    case UserAction.HighRiskMode:
      return toggleHighRiskMode(state);
    case UserAction.ReviewCleanup:
      return reviewCleanup(state);
    case UserAction.ShowGrowth:
      return showTab(state, Tab.Grew);
    case UserAction.CopySummary:
      return copySummary(state);
    case UserAction.CycleFilter:
      return cycleFilter(state);
    case UserAction.Help:
      return state.screen.kind === ScreenKind.Help
        ? withScreen(state, state.screen.previous)
        : withScreen(state, { kind: ScreenKind.Help, previous: state.screen, selected: 0 });
    case UserAction.Quit:
      return state.cleanup.phase === CleanupPhase.Running
        ? stay(state)
        : withEffect(state, { kind: EffectKind.Quit });
    case UserAction.MoveUp:
    case UserAction.MoveDown:
    case UserAction.PageUp:
    case UserAction.PageDown:
      return stay(state);
  }
}

function scanStateAfter(scan: ScanState, update: DiagnosisUpdate): ScanState {
  switch (update.kind) {
    case DiagnosisUpdateKind.Progress:
      return scan.status === ScanStatus.Running
        ? { ...scan, stage: update.stage, progress: update.progress }
        : scan;
    case DiagnosisUpdateKind.PreliminaryFindings:
      return scan.status === ScanStatus.Running ? { ...scan, findings: update.findings } : scan;
    case DiagnosisUpdateKind.Completed:
      return {
        status: ScanStatus.Completed,
        report: update.report,
        findings: update.report.findings,
        classificationByPath: new Map(
          update.report.classification.classifications.map((item) => [item.path.toString(), item]),
        ),
      };
    case DiagnosisUpdateKind.Failed:
      return { status: ScanStatus.Failed, reason: update.reason, findings: scan.findings };
  }
}

/** Moving the cursor doesn't hide a message the person may still be reading. */
const MOVEMENT_ACTIONS: readonly UserAction[] = [
  UserAction.MoveUp,
  UserAction.MoveDown,
  UserAction.PageUp,
  UserAction.PageDown,
];

export function reduce(state: AppState, event: AppEvent): Transition {
  switch (event.kind) {
    case AppEventKind.ActionRequested:
      return reduceAction(
        MOVEMENT_ACTIONS.includes(event.action) ? state : { ...state, notice: undefined },
        event.action,
      );
    case AppEventKind.FilterSelected:
      return state.screen.kind === ScreenKind.Diagnosis
        ? stay({
            ...state,
            notice: undefined,
            findingFilter: event.filter,
            screen: { ...state.screen, selected: 0 },
          })
        : stay(state);
    case AppEventKind.RowClicked:
      return open({
        ...state,
        notice: undefined,
        screen: withSelection(state.screen, event.index),
      });
    case AppEventKind.DiagnosisUpdated: {
      const updated = { ...state, scan: scanStateAfter(state.scan, event.update) };
      return event.update.kind === DiagnosisUpdateKind.Completed
        ? withEffect(updated, {
            kind: EffectKind.RecordHistory,
            snapshot: event.update.report.snapshot,
            scope: state.scope,
          })
        : stay(updated);
    }
    case AppEventKind.HistoryCompared:
      return stay({ ...state, growth: event.diff });
    case AppEventKind.VolumeMeasured:
      return stay({ ...state, volume: event.usage });
    case AppEventKind.ClipboardCopied:
      return withNotice(
        state,
        state.screen.kind === ScreenKind.CleanupReport
          ? UiCopy.notices.summaryCopied
          : UiCopy.notices.copied,
      );
    case AppEventKind.ClipboardFailed:
      return withNotice(state, UiCopy.notices.copyFailed(event.reason));
    case AppEventKind.StorageDescribed:
      return stay({ ...state, storage: event.layout });
    case AppEventKind.FullDiskAccessChecked:
      return stay({ ...state, fullDiskAccess: event.access });
    case AppEventKind.SettingsOpened:
      return withNotice(state, UiCopy.notices.settingsOpened);
    case AppEventKind.SettingsFailed:
      return withNotice(state, UiCopy.notices.settingsFailed(event.reason));
    case AppEventKind.CleanupPlanned:
      return state.cleanup.phase === CleanupPhase.Planning
        ? stay({
            ...state,
            cleanup: { phase: CleanupPhase.Reviewing, plan: event.plan, typed: "" },
          })
        : stay(state);
    case AppEventKind.CleanupActionFinished:
      return state.cleanup.phase === CleanupPhase.Running
        ? stay({
            ...state,
            cleanup: { ...state.cleanup, results: [...state.cleanup.results, event.result] },
          })
        : stay(state);
    case AppEventKind.CleanupFinished:
      return stay({
        ...state,
        cart: new Map(),
        cleanup: { phase: CleanupPhase.Finished, report: event.report },
        screen: { kind: ScreenKind.CleanupReport },
      });
    case AppEventKind.ConfirmationTyped:
      return typeConfirmation(state, event.character);
    case AppEventKind.ConfirmationErased:
      return eraseConfirmation(state);
    case AppEventKind.DialogKeyPressed:
      return pressDialogKey({ ...state, notice: undefined }, event.key);
  }
}
