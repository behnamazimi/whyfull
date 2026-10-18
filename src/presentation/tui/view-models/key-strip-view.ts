import { BlockReason, FindingGroup, findingGroup, ScanScopeKind } from "../../../domain/index.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { DialogKey, dialogKeyLabel, keyLabel, UserAction } from "../../keymap.ts";
import { Glyph } from "../../theme.ts";
import { CleanupPhase, type AppState } from "../state/app-state.ts";
import { ScreenKind } from "../state/screen.ts";
import { trashEntryAfterCleanup } from "../state/trash-offer.ts";
import { isTypingConfirmation } from "../state/selectors.ts";
import { Layout, type Viewport } from "./layout.ts";

export interface KeyHint {
  readonly key: string;
  readonly label: string;
  /** Kept when the row is too narrow for every hint. */
  readonly essential: boolean;
  /** What clicking the hint does. Dialog keys that no action stands for have none. */
  readonly action: UserAction | undefined;
}

/** One row of hints. The frame never wraps them, so every screen's bottom line looks the same. */
export interface KeyStripView {
  readonly hints: readonly KeyHint[];
}

const hint = (action: UserAction, label: string = UiCopy.actions[action]): KeyHint => ({
  key: keyLabel[action],
  label,
  essential: false,
  action,
});

const essential = (action: UserAction, label?: string): KeyHint => ({
  ...hint(action, label),
  essential: true,
});

const moveHint: KeyHint = {
  key: `${keyLabel[UserAction.MoveUp]}${keyLabel[UserAction.MoveDown]}`,
  label: UiCopy.actions[UserAction.MoveDown],
  essential: true,
  action: UserAction.MoveDown,
};

const hintWidth = (item: KeyHint): number => item.key.length + 1 + item.label.length;

const rowWidth = (hints: readonly KeyHint[]): number =>
  hints.reduce((sum, item) => sum + hintWidth(item), 0) +
  Math.max(0, hints.length - 1) * Glyph.separator.length;

const NOT_FOUND = -1;

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

/** The one key that belongs to this screen alone, shown between "open" and "more". */
function screenHint(state: AppState): readonly KeyHint[] {
  switch (state.screen.kind) {
    case ScreenKind.Diagnosis:
      return state.scan.findings.some((finding) => findingGroup(finding) === FindingGroup.Safe)
        ? [hint(UserAction.SelectAllSafe)]
        : [];
    case ScreenKind.FindingDetail:
    case ScreenKind.Folders:
      return [hint(UserAction.Back)];
    case ScreenKind.DiskOverview: {
      const { wholeDiskScope } = state.context;
      return wholeDiskScope !== undefined && state.scope.kind !== ScanScopeKind.WholeDisk
        ? [hint(UserAction.ScanWholeDisk)]
        : [];
    }
    case ScreenKind.Growth:
    case ScreenKind.PromptPreview:
    case ScreenKind.Help:
    case ScreenKind.PermissionGuide:
    case ScreenKind.CleanupReview:
    case ScreenKind.CleanupReport:
    case ScreenKind.HighRiskDialog:
      return [];
  }
}

const RECHECKABLE_REASONS: ReadonlySet<BlockReason> = new Set([
  BlockReason.AppRunning,
  BlockReason.ToolMissing,
  BlockReason.ToolUnusable,
  BlockReason.ToolNotRunning,
  BlockReason.ToolNotResponding,
  BlockReason.ToolWrongEngine,
]);

const isSelectable = (state: AppState): boolean =>
  state.screen.kind !== ScreenKind.DiskOverview && state.screen.kind !== ScreenKind.Growth;

/** Items left out because an app is open or a tool isn't ready may be fine a moment later. */
function canRecheck(state: AppState): boolean {
  return (
    state.cleanup.phase === CleanupPhase.Reviewing &&
    state.cleanup.plan.blocked.some((item) => RECHECKABLE_REASONS.has(item.reason))
  );
}

function hintsFor(state: AppState): readonly KeyHint[] {
  switch (state.screen.kind) {
    case ScreenKind.Diagnosis:
    case ScreenKind.FindingDetail:
    case ScreenKind.Folders:
    case ScreenKind.DiskOverview:
    case ScreenKind.Growth:
      return [
        moveHint,
        ...(isSelectable(state) ? [essential(UserAction.ToggleCleanup)] : []),
        hint(UserAction.Open),
        ...screenHint(state),
        essential(UserAction.Help),
        essential(UserAction.Quit),
      ];
    case ScreenKind.PromptPreview:
      return [essential(UserAction.Open, UiCopy.copyAction), essential(UserAction.Back)];
    case ScreenKind.Help:
      return [
        essential(UserAction.MoveDown, UiCopy.scrollAction),
        essential(UserAction.Back),
        essential(UserAction.Help, UiCopy.closeHelpAction),
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
        ...(canRecheck(state) ? [essential(UserAction.Recheck, UiCopy.cleanup.recheckAction)] : []),
        isTypingConfirmation(state)
          ? essential(UserAction.Open, UiCopy.cleanup.confirmTypedAction)
          : essential(UserAction.ConfirmCleanup, UiCopy.cleanup.confirmAction),
        essential(UserAction.Back, UiCopy.cleanup.cancelAction),
      ];
    case ScreenKind.CleanupReport:
      return [
        ...(trashEntryAfterCleanup(state) === undefined
          ? []
          : [essential(UserAction.ConfirmCleanup, UiCopy.cleanup.emptyTrashAction)]),
        essential(UserAction.Open, UiCopy.cleanup.scanAgainAction),
        essential(UserAction.CopySummary),
        essential(UserAction.Quit),
      ];
    case ScreenKind.HighRiskDialog:
      return Object.values(DialogKey).map((key) => ({
        key: dialogKeyLabel[key],
        label: UiCopy.highRisk.keys[key],
        essential: true,
        action: undefined,
      }));
  }
}

export const keyStripView = (state: AppState, viewport: Viewport): KeyStripView => ({
  hints: fitting(hintsFor(state), viewport),
});
