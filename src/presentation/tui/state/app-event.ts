import type { DiagnosisUpdate } from "../../../application/index.ts";
import type { VolumeUsage } from "../../../domain/index.ts";
import type { UserAction } from "../../keymap.ts";

export const AppEventKind = {
  ActionRequested: "action-requested",
  RowClicked: "row-clicked",
  DiagnosisUpdated: "diagnosis-updated",
  VolumeMeasured: "volume-measured",
  ClipboardCopied: "clipboard-copied",
  ClipboardFailed: "clipboard-failed",
} as const;
export type AppEventKind = (typeof AppEventKind)[keyof typeof AppEventKind];

export type AppEvent =
  | { readonly kind: typeof AppEventKind.ActionRequested; readonly action: UserAction }
  | { readonly kind: typeof AppEventKind.RowClicked; readonly index: number }
  | { readonly kind: typeof AppEventKind.DiagnosisUpdated; readonly update: DiagnosisUpdate }
  | { readonly kind: typeof AppEventKind.VolumeMeasured; readonly usage: VolumeUsage }
  | { readonly kind: typeof AppEventKind.ClipboardCopied }
  | { readonly kind: typeof AppEventKind.ClipboardFailed; readonly reason: string };

export const EffectKind = {
  CopyToClipboard: "copy-to-clipboard",
  Quit: "quit",
} as const;
export type EffectKind = (typeof EffectKind)[keyof typeof EffectKind];

export type Effect =
  | { readonly kind: typeof EffectKind.CopyToClipboard; readonly text: string }
  | { readonly kind: typeof EffectKind.Quit };
