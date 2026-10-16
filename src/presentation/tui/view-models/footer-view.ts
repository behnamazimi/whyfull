import { totalSizeOf } from "../../../domain/index.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatCount } from "../../format/count-format.ts";
import { DialogKey, dialogKeyLabel, keyLabel, UserAction } from "../../keymap.ts";
import { Glyph } from "../../theme.ts";
import { CleanupPhase, ScanStatus, type AppState } from "../state/app-state.ts";
import { findingsOf, isTypingConfirmation } from "../state/selectors.ts";
import { ScreenKind } from "../state/screen.ts";
import { Layout, type Viewport } from "./layout.ts";

export interface KeyHint {
  readonly key: string;
  readonly label: string;
  /** Kept when two rows can't show every hint; the rest are listed under help. */
  readonly essential: boolean;
}

export interface FooterView {
  /** One row of hints, or two when one is too narrow. */
  readonly hintRows: readonly (readonly KeyHint[])[];
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

function wrapped(hints: readonly KeyHint[], available: number): readonly (readonly KeyHint[])[] {
  const rows: KeyHint[][] = [];
  for (const item of hints) {
    const current = rows[rows.length - 1];
    if (current !== undefined && rowWidth([...current, item]) <= available) current.push(item);
    else rows.push([item]);
  }
  return rows;
}

function fitting(hints: readonly KeyHint[], viewport: Viewport): readonly (readonly KeyHint[])[] {
  const available = viewport.columns - Layout.footerPadding;
  let shown = hints;
  while (wrapped(shown, available).length > Layout.footerHintRowsMost) {
    const droppable = shown.findLastIndex((item) => !item.essential);
    if (droppable === NOT_FOUND) break;
    shown = shown.filter((_, index) => index !== droppable);
  }
  return wrapped(shown, available);
}

function cleanupHints(state: AppState): readonly KeyHint[] {
  const toggle = essential(UserAction.ToggleCleanup);
  if (state.cart.size === 0) return [toggle];
  const entries = [...state.cart.values()];
  const summary = UiCopy.cleanup.cartSummary(
    formatCount(entries.length),
    formatByteSize(totalSizeOf(entries)),
  );
  return [toggle, essential(UserAction.ReviewCleanup, summary)];
}

function hintsFor(state: AppState): readonly KeyHint[] {
  switch (state.screen.kind) {
    case ScreenKind.Diagnosis:
      return [
        ...(findingsOf(state).length === 0
          ? []
          : [hint(UserAction.Open), ...cleanupHints(state), hint(UserAction.AskAssistant)]),
        hint(UserAction.BrowseFolders),
        hint(UserAction.ShowDiskOverview),
        hint(UserAction.HighRiskMode),
        ...(state.scan.status === ScanStatus.Completed ? [hint(UserAction.ShowGrowth)] : []),
        essential(UserAction.Help),
        essential(UserAction.Quit),
      ];
    case ScreenKind.FindingDetail:
      return [
        hint(UserAction.Open),
        ...cleanupHints(state),
        hint(UserAction.AskAssistant),
        hint(UserAction.HighRiskMode),
        essential(UserAction.Back),
        essential(UserAction.Quit),
      ];
    case ScreenKind.Folders:
      return [
        hint(UserAction.Open),
        ...cleanupHints(state),
        hint(UserAction.AskAssistant),
        hint(UserAction.HighRiskMode),
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
      return [
        essential(UserAction.Open, UiCopy.openSettingsAction),
        essential(UserAction.Back),
        essential(UserAction.Quit),
      ];
    case ScreenKind.CleanupReview:
      if (state.cleanup.phase === CleanupPhase.Running) return [];
      return [
        isTypingConfirmation(state)
          ? essential(UserAction.Open, UiCopy.cleanup.confirmTypedAction)
          : essential(UserAction.ConfirmCleanup, UiCopy.cleanup.confirmAction),
        essential(UserAction.Back, UiCopy.cleanup.cancelAction),
      ];
    case ScreenKind.CleanupReport:
      return [
        essential(UserAction.Open, UiCopy.cleanup.scanAgainAction),
        essential(UserAction.Quit),
      ];
    case ScreenKind.Growth:
      return [essential(UserAction.Back), essential(UserAction.Quit)];
    case ScreenKind.HighRiskDialog:
      return Object.values(DialogKey).map((key) => ({
        key: dialogKeyLabel[key],
        label: UiCopy.highRisk.keys[key],
        essential: true,
      }));
  }
}

export const footerView = (state: AppState, viewport: Viewport): FooterView => ({
  hintRows: fitting(hintsFor(state), viewport),
  notice: state.notice,
});

/** Rows the footer takes beyond the notice and first hint row that `Layout.footerLines` counts. */
export const extraFooterLines = (footer: FooterView): number =>
  Math.max(0, footer.hintRows.length - 1);
