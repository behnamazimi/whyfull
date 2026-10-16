import type { AbsolutePath } from "../../../domain/index.ts";

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
  | { readonly kind: typeof ScreenKind.Help; readonly previous: Screen }
  | { readonly kind: typeof ScreenKind.DiskOverview; readonly previous: Screen }
  | { readonly kind: typeof ScreenKind.PermissionGuide; readonly previous: Screen }
  | { readonly kind: typeof ScreenKind.CleanupReview; readonly previous: Screen }
  | { readonly kind: typeof ScreenKind.CleanupReport }
  | { readonly kind: typeof ScreenKind.Growth; readonly previous: Screen };

export const initialScreen: Screen = { kind: ScreenKind.Diagnosis, selected: 0 };
