import { UiCopy } from "../../copy/ui-copy.ts";
import { checkboxGlyph, SelectionState } from "../../theme.ts";
import { DialogButton, type ScreenKind, type Screen } from "../state/screen.ts";
import { Layout, type Viewport } from "./layout.ts";

type HighRiskDialog = Extract<Screen, { readonly kind: typeof ScreenKind.HighRiskDialog }>;

export interface DialogButtonView {
  readonly label: string;
  readonly focused: boolean;
  readonly enabled: boolean;
}

/** The confirmation dialog that turns high-risk mode on. It sits over the current screen. */
export interface HighRiskDialogView {
  readonly title: string;
  readonly body: string;
  readonly keptHeading: string;
  readonly kept: string;
  readonly checkbox: string;
  readonly acknowledgement: string;
  readonly acknowledged: boolean;
  readonly buttons: readonly DialogButtonView[];
  readonly width: number;
}

const buttonLabel: Readonly<Record<DialogButton, string>> = {
  [DialogButton.Cancel]: UiCopy.highRisk.cancelButton,
  [DialogButton.TurnOn]: UiCopy.highRisk.turnOnButton,
};

export function highRiskDialogView(dialog: HighRiskDialog, viewport: Viewport): HighRiskDialogView {
  return {
    title: UiCopy.highRisk.title,
    body: UiCopy.highRisk.body,
    keptHeading: UiCopy.highRisk.keptHeading,
    kept: UiCopy.highRisk.kept,
    checkbox: checkboxGlyph[dialog.acknowledged ? SelectionState.All : SelectionState.None],
    acknowledgement: UiCopy.highRisk.acknowledgement,
    acknowledged: dialog.acknowledged,
    buttons: Object.values(DialogButton).map((button) => ({
      label: buttonLabel[button],
      focused: dialog.focus === button,
      enabled: button === DialogButton.Cancel || dialog.acknowledged,
    })),
    width: Math.min(Layout.dialogColumns, viewport.columns - Layout.dialogMargin),
  };
}
