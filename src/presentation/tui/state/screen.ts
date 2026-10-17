import type { AbsolutePath, HighRiskEntry } from "../../../domain/index.ts";

export const ScreenKind = {
  Diagnosis: "diagnosis",
  FindingDetail: "finding-detail",
  Folders: "folders",
  PromptPreview: "prompt-preview",
  Help: "help",
  DiskOverview: "disk-overview",
  PermissionGuide: "permission-guide",
  CleanupReview: "cleanup-review",
  CleanupReport: "cleanup-report",
  Growth: "growth",
  HighRiskDialog: "high-risk-dialog",
} as const;
export type ScreenKind = (typeof ScreenKind)[keyof typeof ScreenKind];

export type Screen =
  | { readonly kind: typeof ScreenKind.Diagnosis; readonly selected: number }
  | {
      readonly kind: typeof ScreenKind.FindingDetail;
      readonly findingIndex: number;
      readonly selected: number;
      readonly previous: Screen;
    }
  | {
      readonly kind: typeof ScreenKind.Folders;
      readonly folder: AbsolutePath;
      readonly selected: number;
      readonly previous: Screen;
    }
  | {
      readonly kind: typeof ScreenKind.PromptPreview;
      readonly text: string;
      readonly previous: Screen;
    }
  | {
      readonly kind: typeof ScreenKind.Help;
      readonly previous: Screen;
      /** The first line of help that is shown. */
      readonly selected: number;
    }
  | {
      readonly kind: typeof ScreenKind.DiskOverview;
      readonly previous: Screen;
      readonly selected: number;
    }
  | { readonly kind: typeof ScreenKind.PermissionGuide; readonly previous: Screen }
  | { readonly kind: typeof ScreenKind.CleanupReview; readonly previous: Screen }
  | { readonly kind: typeof ScreenKind.CleanupReport }
  | {
      readonly kind: typeof ScreenKind.Growth;
      readonly previous: Screen;
      readonly selected: number;
    }
  | {
      readonly kind: typeof ScreenKind.HighRiskDialog;
      readonly previous: Screen;
      /** The item the person was on, added once they turn the mode on. */
      readonly pending: HighRiskEntry | undefined;
    };

/** The screens that fill the frame's body. Every other screen is a dialog over one of these. */
export type TabScreen = Extract<
  Screen,
  {
    readonly kind:
      | typeof ScreenKind.Diagnosis
      | typeof ScreenKind.FindingDetail
      | typeof ScreenKind.Folders
      | typeof ScreenKind.DiskOverview
      | typeof ScreenKind.Growth;
  }
>;

export const initialScreen: TabScreen = { kind: ScreenKind.Diagnosis, selected: 0 };

/** The four places that every screen frame offers as tabs. */
export const Tab = {
  Cleanup: "cleanup",
  Folders: "folders",
  Disk: "disk",
  Grew: "grew",
} as const;
export type Tab = (typeof Tab)[keyof typeof Tab];

export const tabOrder: readonly Tab[] = [Tab.Cleanup, Tab.Folders, Tab.Disk, Tab.Grew];

/** Dialogs sit over the screen beneath them. Everything else is a screen in its own right. */
export function isDialog(screen: Screen): boolean {
  switch (screen.kind) {
    case ScreenKind.PromptPreview:
    case ScreenKind.Help:
    case ScreenKind.PermissionGuide:
    case ScreenKind.CleanupReview:
    case ScreenKind.CleanupReport:
    case ScreenKind.HighRiskDialog:
      return true;
    case ScreenKind.Diagnosis:
    case ScreenKind.FindingDetail:
    case ScreenKind.Folders:
    case ScreenKind.DiskOverview:
    case ScreenKind.Growth:
      return false;
  }
}

/** The screen a dialog sits over, or the screen itself when it is not a dialog. */
export function screenBeneath(screen: Screen): TabScreen {
  switch (screen.kind) {
    case ScreenKind.PromptPreview:
    case ScreenKind.Help:
    case ScreenKind.PermissionGuide:
    case ScreenKind.CleanupReview:
    case ScreenKind.HighRiskDialog:
      return screenBeneath(screen.previous);
    case ScreenKind.CleanupReport:
      return initialScreen;
    case ScreenKind.Diagnosis:
    case ScreenKind.FindingDetail:
    case ScreenKind.Folders:
    case ScreenKind.DiskOverview:
    case ScreenKind.Growth:
      return screen;
  }
}

export function tabOf(screen: Screen): Tab {
  const beneath = screenBeneath(screen);
  switch (beneath.kind) {
    case ScreenKind.Folders:
      return Tab.Folders;
    case ScreenKind.DiskOverview:
      return Tab.Disk;
    case ScreenKind.Growth:
      return Tab.Grew;
    case ScreenKind.Diagnosis:
    case ScreenKind.FindingDetail:
      return Tab.Cleanup;
  }
}
