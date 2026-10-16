import { totalSizeOf } from "../../../domain/index.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatCount } from "../../format/count-format.ts";
import { keyLabel, UserAction } from "../../keymap.ts";
import { Glyph } from "../../theme.ts";
import { CleanupPhase, type AppState } from "../state/app-state.ts";
import { ScreenKind } from "../state/screen.ts";
import { hasGrowthNews } from "./growth-view.ts";
import { Layout, type Viewport } from "./layout.ts";

export interface KeyHint {
  readonly key: string;
  readonly label: string;
  /** Kept when the window is too narrow to show every hint; the rest are listed under help. */
  readonly essential: boolean;
}

export interface FooterView {
  readonly hints: readonly KeyHint[];
  readonly notice: string | undefined;
}

const hint = (action: UserAction, label: string = UiCopy.actions[action]): KeyHint => ({
  key: keyLabel[action],
  label,
  essential: false,
});

const essential = (action: UserAction, label?: string): KeyHint => ({
  ...hint(action, label),
  essential: true,
});

const NOT_FOUND = -1;

const hintWidth = (item: KeyHint): number => item.key.length + 1 + item.label.length;

const rowWidth = (hints: readonly KeyHint[]): number =>
  hints.reduce((sum, item) => sum + hintWidth(item), 0) +
  Math.max(0, hints.length - 1) * Glyph.separator.length;

function fitting(hints: readonly KeyHint[], viewport: Viewport): readonly KeyHint[] {
  const available = viewport.columns - Layout.footerPadding;
  let shown = hints;
  while (rowWidth(shown) > available) {
    const droppable = shown.findLastIndex((item) => !item.essential);
    if (droppable === NOT_FOUND) break;
    shown = shown.filter((_, index) => index !== droppable);
  }
  return shown;
}

function cleanupHints(state: AppState, offersStale: boolean): readonly KeyHint[] {
  const toggle = essential(UserAction.ToggleCleanup);
  const stale = offersStale ? [hint(UserAction.SelectStale)] : [];
  if (state.cart.size === 0) return [toggle, ...stale];
  const entries = [...state.cart.values()];
  const summary = UiCopy.cleanup.cartSummary(
    formatCount(entries.length),
    formatByteSize(totalSizeOf(entries)),
  );
  return [toggle, ...stale, essential(UserAction.ReviewCleanup, summary)];
}

function hintsFor(state: AppState): readonly KeyHint[] {
  switch (state.screen.kind) {
    case ScreenKind.Diagnosis:
      return [
        hint(UserAction.Open),
        ...cleanupHints(state, true),
        hint(UserAction.AskAssistant),
        hint(UserAction.BrowseFolders),
        hint(UserAction.ShowDiskOverview),
        ...(state.growth === undefined || !hasGrowthNews(state.growth)
          ? []
          : [hint(UserAction.ShowGrowth)]),
        essential(UserAction.Help),
        essential(UserAction.Quit),
      ];
    case ScreenKind.FindingDetail:
      return [
        hint(UserAction.Open),
        ...cleanupHints(state, true),
        hint(UserAction.AskAssistant),
        essential(UserAction.Back),
        essential(UserAction.Quit),
      ];
    case ScreenKind.Folders:
      return [
        hint(UserAction.Open),
        ...cleanupHints(state, false),
        hint(UserAction.AskAssistant),
        essential(UserAction.Back),
        essential(UserAction.Quit),
      ];
    case ScreenKind.PromptPreview:
      return [essential(UserAction.Open, UiCopy.copyAction), essential(UserAction.Back)];
    case ScreenKind.Help:
      return [essential(UserAction.Back)];
    case ScreenKind.DiskOverview:
      return [
        essential(UserAction.ScanWholeDisk),
        hint(UserAction.FixPermissions),
        essential(UserAction.Back),
        essential(UserAction.Quit),
      ];
    case ScreenKind.PermissionGuide:
      return [essential(UserAction.Open, UiCopy.openSettingsAction), essential(UserAction.Back)];
    case ScreenKind.CleanupReview:
      return state.cleanup.phase === CleanupPhase.Running
        ? []
        : [
            essential(UserAction.ConfirmCleanup, UiCopy.cleanup.confirmAction),
            essential(UserAction.Back, UiCopy.cleanup.cancelAction),
          ];
    case ScreenKind.CleanupReport:
      return [
        essential(UserAction.Open, UiCopy.cleanup.scanAgainAction),
        essential(UserAction.Quit),
      ];
    case ScreenKind.Growth:
      return [essential(UserAction.Back), essential(UserAction.Quit)];
  }
}

export const footerView = (state: AppState, viewport: Viewport): FooterView => ({
  hints: fitting(hintsFor(state), viewport),
  notice: state.notice,
});
