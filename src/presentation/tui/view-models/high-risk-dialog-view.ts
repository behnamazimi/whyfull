import { UiCopy } from "../../copy/ui-copy.ts";
import { DialogKey, dialogKeyLabel } from "../../keymap.ts";
import { ScreenKind } from "../state/screen.ts";
import { Layout, type Viewport } from "./layout.ts";

export interface DialogActionView {
  readonly key: string;
  readonly label: string;
}

/** The dialog that turns high-risk mode on. It sits over the current screen. */
export interface HighRiskDialogView {
  readonly kind: typeof ScreenKind.HighRiskDialog;
  readonly title: string;
  readonly body: string;
  readonly keptHeading: string;
  readonly kept: string;
  readonly followUp: string;
  readonly actions: readonly DialogActionView[];
  readonly width: number;
}

export function highRiskDialogView(viewport: Viewport): HighRiskDialogView {
  return {
    kind: ScreenKind.HighRiskDialog,
    title: UiCopy.highRisk.title,
    body: UiCopy.highRisk.body,
    keptHeading: UiCopy.highRisk.keptHeading,
    kept: UiCopy.highRisk.kept,
    followUp: UiCopy.highRisk.followUp,
    actions: Object.values(DialogKey).map((key) => ({
      key: dialogKeyLabel[key],
      label: UiCopy.highRisk.keys[key],
    })),
    width: Math.min(Layout.dialogColumns, viewport.columns - Layout.dialogMargin),
  };
}
