import type { AccessState, DiagnosisReport, DiagnosisUpdate } from "../../../application/index.ts";
import type {
  AbsolutePath,
  ActionResult,
  CleanupDraft,
  CleanupPlan,
  CleanupReport,
  Removal,
  ScanScope,
  ScanSnapshot,
  SnapshotDiff,
  StorageLayout,
  VolumeUsage,
} from "../../../domain/index.ts";
import type { DialogKey, UserAction } from "../../keymap.ts";

export const AppEventKind = {
  ActionRequested: "action-requested",
  RowClicked: "row-clicked",
  DiagnosisUpdated: "diagnosis-updated",
  VolumeMeasured: "volume-measured",
  ClipboardCopied: "clipboard-copied",
  ClipboardFailed: "clipboard-failed",
  StorageDescribed: "storage-described",
  FullDiskAccessChecked: "full-disk-access-checked",
  SettingsOpened: "settings-opened",
  SettingsFailed: "settings-failed",
  RevealFailed: "reveal-failed",
  RunningAppsChecked: "running-apps-checked",
  CleanupPlanned: "cleanup-planned",
  CleanupActionFinished: "cleanup-action-finished",
  CleanupFinished: "cleanup-finished",
  HistoryCompared: "history-compared",
  ScanRefreshed: "scan-refreshed",
  ConfirmationTyped: "confirmation-typed",
  ConfirmationErased: "confirmation-erased",
  DialogKeyPressed: "dialog-key-pressed",
} as const;
export type AppEventKind = (typeof AppEventKind)[keyof typeof AppEventKind];

export type AppEvent =
  | { readonly kind: typeof AppEventKind.ActionRequested; readonly action: UserAction }
  | { readonly kind: typeof AppEventKind.RowClicked; readonly index: number }
  | { readonly kind: typeof AppEventKind.DiagnosisUpdated; readonly update: DiagnosisUpdate }
  | { readonly kind: typeof AppEventKind.VolumeMeasured; readonly usage: VolumeUsage }
  | { readonly kind: typeof AppEventKind.ClipboardCopied }
  | { readonly kind: typeof AppEventKind.ClipboardFailed; readonly reason: string }
  | { readonly kind: typeof AppEventKind.StorageDescribed; readonly layout: StorageLayout }
  | { readonly kind: typeof AppEventKind.FullDiskAccessChecked; readonly access: AccessState }
  | { readonly kind: typeof AppEventKind.SettingsOpened }
  | { readonly kind: typeof AppEventKind.SettingsFailed; readonly reason: string }
  | { readonly kind: typeof AppEventKind.RevealFailed; readonly reason: string }
  | { readonly kind: typeof AppEventKind.RunningAppsChecked; readonly apps: ReadonlySet<string> }
  | { readonly kind: typeof AppEventKind.CleanupPlanned; readonly plan: CleanupPlan }
  | { readonly kind: typeof AppEventKind.CleanupActionFinished; readonly result: ActionResult }
  | { readonly kind: typeof AppEventKind.CleanupFinished; readonly report: CleanupReport }
  | { readonly kind: typeof AppEventKind.HistoryCompared; readonly diff: SnapshotDiff | undefined }
  | { readonly kind: typeof AppEventKind.ScanRefreshed; readonly report: DiagnosisReport }
  | { readonly kind: typeof AppEventKind.ConfirmationTyped; readonly character: string }
  | { readonly kind: typeof AppEventKind.ConfirmationErased }
  | { readonly kind: typeof AppEventKind.DialogKeyPressed; readonly key: DialogKey };

export const EffectKind = {
  CopyToClipboard: "copy-to-clipboard",
  Quit: "quit",
  StartScan: "start-scan",
  OpenPermissionSettings: "open-permission-settings",
  RevealInFinder: "reveal-in-finder",
  PlanCleanup: "plan-cleanup",
  RunCleanup: "run-cleanup",
  RecordHistory: "record-history",
  RefreshScan: "refresh-scan",
  RecordHighRiskMode: "record-high-risk-mode",
} as const;
export type EffectKind = (typeof EffectKind)[keyof typeof EffectKind];

export type Effect =
  | { readonly kind: typeof EffectKind.CopyToClipboard; readonly text: string }
  | { readonly kind: typeof EffectKind.Quit }
  | { readonly kind: typeof EffectKind.StartScan; readonly scope: ScanScope }
  | { readonly kind: typeof EffectKind.OpenPermissionSettings }
  | { readonly kind: typeof EffectKind.RevealInFinder; readonly path: AbsolutePath }
  | {
      readonly kind: typeof EffectKind.PlanCleanup;
      readonly draft: CleanupDraft;
      readonly scanRoot: AbsolutePath;
    }
  | {
      readonly kind: typeof EffectKind.RunCleanup;
      readonly plan: CleanupPlan;
      readonly volume: AbsolutePath;
    }
  | {
      readonly kind: typeof EffectKind.RecordHistory;
      readonly snapshot: ScanSnapshot;
      readonly scope: ScanScope;
    }
  | {
      readonly kind: typeof EffectKind.RefreshScan;
      readonly report: DiagnosisReport;
      readonly removals: readonly Removal[];
      readonly remeasure: readonly AbsolutePath[];
    }
  | { readonly kind: typeof EffectKind.RecordHighRiskMode; readonly turnedOn: boolean };
