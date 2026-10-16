import { DiagnosisUpdateKind, type DiagnosisUpdate } from "../../../application/index.ts";
import { assertNever, FindingKind, type AbsolutePath } from "../../../domain/index.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { UserAction } from "../../keymap.ts";
import { ScanStatus, type AppState, type ScanState } from "./app-state.ts";
import { AppEventKind, EffectKind, type AppEvent, type Effect } from "./app-event.ts";
import { ScreenKind, type Screen } from "./screen.ts";
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

export interface Transition {
  readonly state: AppState;
  readonly effects: readonly Effect[];
}

const stay = (state: AppState): Transition => ({ state, effects: [] });
const withScreen = (state: AppState, screen: Screen): Transition => stay({ ...state, screen });
const withNotice = (state: AppState, notice: string): Transition => stay({ ...state, notice });

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
    case UserAction.BrowseFolders:
    case UserAction.AskAssistant:
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
    case ScreenKind.PromptPreview:
    case ScreenKind.Help:
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
      return { ...screen, selected };
    case ScreenKind.PromptPreview:
    case ScreenKind.Help:
      return screen;
    default:
      return assertNever(screen);
  }
}

const selectedIndexOf = (screen: Screen): number =>
  screen.kind === ScreenKind.Diagnosis ||
  screen.kind === ScreenKind.FindingDetail ||
  screen.kind === ScreenKind.Folders
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
    case ScreenKind.PromptPreview:
    case ScreenKind.Help:
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
      return {
        state: { ...state, screen: screen.previous },
        effects: [{ kind: EffectKind.CopyToClipboard, text: screen.text }],
      };
    case ScreenKind.Help:
      return withScreen(state, screen.previous);
    default:
      return assertNever(screen);
  }
}

function back(state: AppState): Transition {
  const { screen } = state;
  return screen.kind === ScreenKind.Diagnosis ? stay(state) : withScreen(state, screen.previous);
}

function reduceAction(state: AppState, action: UserAction): Transition {
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
    case UserAction.BrowseFolders:
      return openFolder(state, state.context.scanRoot, state.screen);
    case UserAction.AskAssistant:
      return askAssistant(state, selectedPath(state));
    case UserAction.Help:
      return state.screen.kind === ScreenKind.Help
        ? withScreen(state, state.screen.previous)
        : withScreen(state, { kind: ScreenKind.Help, previous: state.screen });
    case UserAction.Quit:
      return { state, effects: [{ kind: EffectKind.Quit }] };
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

export function reduce(state: AppState, event: AppEvent): Transition {
  switch (event.kind) {
    case AppEventKind.ActionRequested:
      return reduceAction({ ...state, notice: undefined }, event.action);
    case AppEventKind.RowClicked:
      return open({
        ...state,
        notice: undefined,
        screen: withSelection(state.screen, event.index),
      });
    case AppEventKind.DiagnosisUpdated:
      return stay({ ...state, scan: scanStateAfter(state.scan, event.update) });
    case AppEventKind.VolumeMeasured:
      return stay({ ...state, volume: event.usage });
    case AppEventKind.ClipboardCopied:
      return withNotice(state, UiCopy.notices.copied);
    case AppEventKind.ClipboardFailed:
      return withNotice(state, UiCopy.notices.copyFailed(event.reason));
  }
}
