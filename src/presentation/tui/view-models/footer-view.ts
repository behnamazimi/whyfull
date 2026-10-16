import { totalSizeOf } from "../../../domain/index.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatCount } from "../../format/count-format.ts";
import { keyLabel, UserAction } from "../../keymap.ts";
import { CleanupPhase, type AppState } from "../state/app-state.ts";
import { ScreenKind } from "../state/screen.ts";

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

function cleanupHints(state: AppState): readonly KeyHint[] {
  const toggle = hint(UserAction.ToggleCleanup);
  if (state.cart.size === 0) return [toggle];
  const entries = [...state.cart.values()];
  const summary = UiCopy.cleanup.cartSummary(
    formatCount(entries.length),
    formatByteSize(totalSizeOf(entries)),
  );
  return [toggle, hint(UserAction.ReviewCleanup, summary)];
}

function hintsFor(state: AppState): readonly KeyHint[] {
  switch (state.screen.kind) {
    case ScreenKind.Diagnosis:
      return [
        hint(UserAction.Open),
        ...cleanupHints(state),
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
        ...cleanupHints(state),
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
    case ScreenKind.CleanupReview:
      return state.cleanup.phase === CleanupPhase.Running
        ? []
        : [
            hint(UserAction.Open, UiCopy.cleanup.confirmAction),
            hint(UserAction.Back, UiCopy.cleanup.cancelAction),
          ];
    case ScreenKind.CleanupReport:
      return [hint(UserAction.Open, UiCopy.cleanup.scanAgainAction), hint(UserAction.Quit)];
  }
}

export const footerView = (state: AppState): FooterView => ({
  hints: hintsFor(state),
  notice: state.notice,
});
