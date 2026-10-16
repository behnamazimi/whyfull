import { UiCopy } from "../../copy/ui-copy.ts";
import { keyLabel, UserAction } from "../../keymap.ts";
import type { AppState } from "../state/app-state.ts";
import { ScreenKind, type Screen } from "../state/screen.ts";

export interface KeyHint {
  readonly key: string;
  readonly label: string;
}

export interface FooterView {
  readonly hints: readonly KeyHint[];
  readonly notice: string | undefined;
}

const hint = (action: UserAction, label: string = UiCopy.actions[action]): KeyHint => ({
  key: keyLabel[action],
  label,
});

function hintsFor(screen: Screen): readonly KeyHint[] {
  switch (screen.kind) {
    case ScreenKind.Diagnosis:
      return [
        hint(UserAction.Open),
        hint(UserAction.AskAssistant),
        hint(UserAction.BrowseFolders),
        hint(UserAction.ShowDiskOverview),
        hint(UserAction.Help),
        hint(UserAction.Quit),
      ];
    case ScreenKind.FindingDetail:
    case ScreenKind.Folders:
      return [
        hint(UserAction.Open),
        hint(UserAction.AskAssistant),
        hint(UserAction.Back),
        hint(UserAction.Quit),
      ];
    case ScreenKind.PromptPreview:
      return [hint(UserAction.Open, UiCopy.copyAction), hint(UserAction.Back)];
    case ScreenKind.Help:
      return [hint(UserAction.Back)];
    case ScreenKind.DiskOverview:
      return [
        hint(UserAction.ScanWholeDisk),
        hint(UserAction.FixPermissions),
        hint(UserAction.Back),
        hint(UserAction.Quit),
      ];
    case ScreenKind.PermissionGuide:
      return [hint(UserAction.Open, UiCopy.openSettingsAction), hint(UserAction.Back)];
  }
}

export const footerView = (state: AppState): FooterView => ({
  hints: hintsFor(state.screen),
  notice: state.notice,
});
