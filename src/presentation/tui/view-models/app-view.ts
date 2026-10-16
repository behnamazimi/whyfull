import { AccessState } from "../../../application/index.ts";
import { assertNever } from "../../../domain/index.ts";
import type { AppState } from "../state/app-state.ts";
import { ScreenKind } from "../state/screen.ts";
import { diagnosisView, type DiagnosisView } from "./diagnosis-view.ts";
import { diskOverviewView, type DiskOverviewView } from "./disk-overview-view.ts";
import { findingDetailView, type FindingDetailView } from "./finding-detail-view.ts";
import { footerView, type FooterView } from "./footer-view.ts";
import { foldersView, type FoldersView } from "./folders-view.ts";
import { headerView, type HeaderView } from "./header-view.ts";
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
  | PermissionGuideView;

export interface AppView {
  readonly header: HeaderView;
  readonly screen: ScreenView;
  readonly footer: FooterView;
}

function screenView(state: AppState, viewport: Viewport, now: Date): ScreenView {
  const { screen } = state;
  switch (screen.kind) {
    case ScreenKind.Diagnosis:
      return diagnosisView(state, screen.selected, viewport);
    case ScreenKind.FindingDetail:
      return (
        findingDetailView(state, screen.findingIndex, screen.selected, viewport, now) ??
        diagnosisView(state, 0, viewport)
      );
    case ScreenKind.Folders:
      return foldersView(state, screen.folder, screen.selected, viewport, now);
    case ScreenKind.PromptPreview:
      return promptPreviewView(screen.text);
    case ScreenKind.Help:
      return helpView();
    case ScreenKind.DiskOverview:
      return diskOverviewView(state);
    case ScreenKind.PermissionGuide:
      return permissionGuideView(state.fullDiskAccess === AccessState.Granted);
    default:
      return assertNever(screen);
  }
}

export const appView = (state: AppState, viewport: Viewport, now: Date): AppView => ({
  header: headerView(state),
  screen: screenView(state, viewport, now),
  footer: footerView(state),
});
