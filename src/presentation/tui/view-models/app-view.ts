import { AccessState } from "../../../application/index.ts";
import { assertNever } from "../../../domain/index.ts";
import type { AppState } from "../state/app-state.ts";
import { ScreenKind, type Screen } from "../state/screen.ts";
import { diagnosisView, type DiagnosisView } from "./diagnosis-view.ts";
import {
  cleanupReportView,
  cleanupReviewView,
  type CleanupReportView,
  type CleanupReviewView,
} from "./cleanup-view.ts";
import { diskOverviewView, type DiskOverviewView } from "./disk-overview-view.ts";
import { findingDetailView, type FindingDetailView } from "./finding-detail-view.ts";
import { extraFooterLines, footerView, type FooterView } from "./footer-view.ts";
import { foldersView, type FoldersView } from "./folders-view.ts";
import { growthView, type GrowthView } from "./growth-view.ts";
import { headerView, type HeaderView } from "./header-view.ts";
import { highRiskDialogView, type HighRiskDialogView } from "./high-risk-dialog-view.ts";
import type { Viewport } from "./layout.ts";
import {
  helpView,
  permissionGuideView,
  promptPreviewView,
  type HelpView,
  type PermissionGuideView,
  type PromptPreviewView,
} from "./simple-views.ts";

export type ScreenView =
  | DiagnosisView
  | FindingDetailView
  | FoldersView
  | PromptPreviewView
  | HelpView
  | DiskOverviewView
  | PermissionGuideView
  | CleanupReviewView
  | CleanupReportView
  | GrowthView;

export interface AppView {
  readonly header: HeaderView;
  readonly screen: ScreenView;
  readonly footer: FooterView;
  /** Set while a confirmation dialog sits over the screen. */
  readonly dialog: HighRiskDialogView | undefined;
}

function screenView(state: AppState, screen: Screen, viewport: Viewport, now: Date): ScreenView {
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
    case ScreenKind.PromptPreview:
      return promptPreviewView(screen.text);
    case ScreenKind.Help:
      return helpView();
    case ScreenKind.DiskOverview:
      return diskOverviewView(state, viewport);
    case ScreenKind.PermissionGuide:
      return permissionGuideView(state.fullDiskAccess === AccessState.Granted);
    case ScreenKind.CleanupReview:
      return cleanupReviewView(state, viewport);
    case ScreenKind.CleanupReport:
      return cleanupReportView(state);
    case ScreenKind.Growth:
      return growthView(state, now);
    case ScreenKind.HighRiskDialog:
      return screenView(state, screen.previous, viewport, now);
    default:
      return assertNever(screen);
  }
}

export function appView(state: AppState, viewport: Viewport, now: Date): AppView {
  const footer = footerView(state, viewport);
  const screenViewport = { ...viewport, rows: viewport.rows - extraFooterLines(footer) };
  return {
    header: headerView(state, viewport),
    screen: screenView(state, state.screen, screenViewport, now),
    footer,
    dialog:
      state.screen.kind === ScreenKind.HighRiskDialog
        ? highRiskDialogView(state.screen, viewport)
        : undefined,
  };
}
