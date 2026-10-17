import { AccessState } from "../../../application/index.ts";
import { Glyph } from "../../theme.ts";
import type { AppState } from "../state/app-state.ts";
import { ScreenKind, screenBeneath, type Screen, type TabScreen } from "../state/screen.ts";
import { actionBarView, type ActionBarView } from "./action-bar-view.ts";
import {
  cleanupReportView,
  cleanupReviewView,
  type CleanupReportView,
  type CleanupReviewView,
} from "./cleanup-view.ts";
import { densityFor, hasRules, totalFrameLines } from "./density.ts";
import { diagnosisView, type DiagnosisView } from "./diagnosis-view.ts";
import { diskOverviewView, type DiskOverviewView } from "./disk-overview-view.ts";
import { findingDetailView, type FindingDetailView } from "./finding-detail-view.ts";
import { foldersView, type FoldersView } from "./folders-view.ts";
import { growthView, type GrowthView } from "./growth-view.ts";
import { highRiskDialogView, type HighRiskDialogView } from "./high-risk-dialog-view.ts";
import { keyStripView, type KeyStripView } from "./key-strip-view.ts";
import { Layout, type Viewport } from "./layout.ts";
import {
  helpView,
  permissionGuideView,
  promptPreviewView,
  type HelpView,
  type PermissionGuideView,
  type PromptPreviewView,
} from "./simple-views.ts";
import { summaryView, type SummaryView } from "./summary-view.ts";
import { tabsView, type TabsView } from "./tabs-view.ts";

export type BodyScreenView =
  DiagnosisView | FindingDetailView | FoldersView | DiskOverviewView | GrowthView;

export type DialogView =
  | PromptPreviewView
  | HelpView
  | PermissionGuideView
  | CleanupReviewView
  | CleanupReportView
  | HighRiskDialogView;

/** Where a dialog sits over the frame, and the room its content has inside the border. */
export interface DialogBox {
  readonly width: number;
  readonly height: number;
  readonly inner: Viewport;
}

export interface AppView {
  readonly tabs: TabsView;
  readonly summary: SummaryView;
  readonly body: BodyScreenView;
  readonly actionBar: ActionBarView;
  readonly keys: KeyStripView;
  /** Set while a dialog sits over the frame. */
  readonly dialog: { readonly view: DialogView; readonly box: DialogBox } | undefined;
}

function bodyView(
  state: AppState,
  screen: TabScreen,
  viewport: Viewport,
  now: Date,
): BodyScreenView {
  switch (screen.kind) {
    case ScreenKind.Diagnosis:
      return diagnosisView(state, screen.selected, viewport, now);
    case ScreenKind.FindingDetail:
      return (
        findingDetailView(state, screen.findingIndex, screen.selected, viewport, now) ??
        diagnosisView(state, 0, viewport, now)
      );
    case ScreenKind.Folders:
      return foldersView(state, screen.folder, screen.selected, viewport, now);
    case ScreenKind.DiskOverview:
      return diskOverviewView(state, screen.selected, viewport);
    case ScreenKind.Growth:
      return growthView(state, screen.selected, viewport);
  }
}

function dialogBox(viewport: Viewport): DialogBox {
  const width = Math.min(Layout.dialogMaximumColumns, viewport.columns);
  const height = viewport.rows - Layout.dialogRowMargin;
  return {
    width,
    height,
    inner: {
      columns: width - Layout.dialogChromeColumns,
      rows: height - Layout.dialogChromeRows,
    },
  };
}

function dialogView(state: AppState, screen: Screen, viewport: Viewport): DialogView | undefined {
  switch (screen.kind) {
    case ScreenKind.PromptPreview:
      return promptPreviewView(screen.text);
    case ScreenKind.Help:
      return helpView(screen.selected, dialogBox(viewport).inner);
    case ScreenKind.PermissionGuide:
      return permissionGuideView(state.fullDiskAccess === AccessState.Granted);
    case ScreenKind.CleanupReview:
      return cleanupReviewView(state, dialogBox(viewport).inner);
    case ScreenKind.CleanupReport:
      return cleanupReportView(state);
    case ScreenKind.HighRiskDialog:
      return highRiskDialogView(viewport);
    case ScreenKind.Diagnosis:
    case ScreenKind.FindingDetail:
    case ScreenKind.Folders:
    case ScreenKind.DiskOverview:
    case ScreenKind.Growth:
      return undefined;
  }
}

export function appView(state: AppState, viewport: Viewport, now: Date): AppView {
  const density = densityFor(viewport.rows);
  const bodyViewport = { ...viewport, rows: viewport.rows - totalFrameLines(density) };
  const view = dialogView(state, state.screen, viewport);
  return {
    tabs: tabsView(
      state,
      viewport,
      hasRules(density) ? Glyph.rule.repeat(Math.max(0, viewport.columns)) : undefined,
    ),
    summary: summaryView(state, viewport, density, now),
    body: bodyView(state, screenBeneath(state.screen), bodyViewport, now),
    actionBar: actionBarView(state, viewport, density),
    keys: keyStripView(state, viewport),
    dialog: view === undefined ? undefined : { view, box: dialogBox(viewport) },
  };
}
