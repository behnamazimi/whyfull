import { UiCopy } from "../../copy/ui-copy.ts";
import { keyLabel, UserAction } from "../../keymap.ts";
import { ScreenKind } from "../state/screen.ts";
import type { KeyHint } from "./footer-view.ts";

const KEY_COLUMN_WIDTH = 8;

export interface PromptPreviewView {
  readonly kind: typeof ScreenKind.PromptPreview;
  readonly title: string;
  readonly explanation: string;
  readonly lines: readonly string[];
}

export interface HelpView {
  readonly kind: typeof ScreenKind.Help;
  readonly title: string;
  readonly lines: readonly string[];
  readonly keys: readonly Pick<KeyHint, "key" | "label">[];
  readonly keyColumnWidth: number;
}

export const promptPreviewView = (text: string): PromptPreviewView => ({
  kind: ScreenKind.PromptPreview,
  title: UiCopy.prompt.title,
  explanation: UiCopy.prompt.explanation,
  lines: text.split("\n"),
});

export const helpView = (): HelpView => ({
  kind: ScreenKind.Help,
  title: UiCopy.help.title,
  lines: UiCopy.help.lines,
  keys: Object.values(UserAction).map((action) => ({
    key: keyLabel[action],
    label: UiCopy.actions[action],
  })),
  keyColumnWidth: KEY_COLUMN_WIDTH,
});

export interface PermissionGuideView {
  readonly kind: typeof ScreenKind.PermissionGuide;
  readonly title: string;
  readonly intro: string;
  readonly steps: readonly string[];
  readonly status: string | undefined;
}

export const permissionGuideView = (alreadyGranted: boolean): PermissionGuideView => ({
  kind: ScreenKind.PermissionGuide,
  title: UiCopy.permissionGuide.title,
  intro: UiCopy.permissionGuide.intro,
  steps: UiCopy.permissionGuide.steps,
  status: alreadyGranted ? UiCopy.permissionGuide.alreadyGranted : undefined,
});
