import {
  CartEntryKind,
  FindingGroup,
  outcomeOfCart,
  sizeOfGroup,
  totalSizeOf,
} from "../../../domain/index.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatCount } from "../../format/count-format.ts";
import { keyLabel, UserAction } from "../../keymap.ts";
import { ColorRole, Glyph } from "../../theme.ts";
import { ScanStatus, type AppState } from "../state/app-state.ts";
import type { Density } from "./density.ts";
import { hasRules } from "./density.ts";
import { Layout, truncate, type Viewport } from "./layout.ts";

export interface ActionBarPart {
  readonly text: string;
  readonly color: ColorRole;
  readonly bold: boolean;
  /** Set when clicking the words does something. */
  readonly action: UserAction | undefined;
}

export interface ActionBarButton {
  readonly key: string;
  readonly label: string;
  readonly enabled: boolean;
  readonly action: UserAction;
}

/** The strip above the keys: what is selected so far, and the one button that starts the cleanup. */
export interface ActionBarView {
  readonly rule: string | undefined;
  readonly parts: readonly ActionBarPart[];
  readonly button: ActionBarButton | undefined;
}

const words = (text: string, color: ColorRole = ColorRole.muted): ActionBarPart => ({
  text,
  color,
  bold: false,
  action: undefined,
});

const strong = (text: string, color: ColorRole): ActionBarPart => ({
  text,
  color,
  bold: true,
  action: undefined,
});

const link = (text: string, action: UserAction): ActionBarPart => ({
  text,
  color: ColorRole.accent,
  bold: false,
  action,
});

/** Cleanup can start from the finished scan, or from what a running scan has measured completely. */
const canPlan = (state: AppState): boolean =>
  state.scan.status === ScanStatus.Completed ||
  (state.scan.status === ScanStatus.Running && state.scan.preview !== undefined);

/** Says what the button gives back, when choosing something would give space back right away. */
function buttonLabel(state: AppState): string {
  const { freesNow } = outcomeOfCart(state.cart.values());
  return freesNow.isZero()
    ? UiCopy.actionBar.review
    : UiCopy.actionBar.reviewAndFree(formatByteSize(freesNow));
}

function button(state: AppState): ActionBarButton {
  return {
    key: keyLabel[UserAction.ReviewCleanup],
    label: buttonLabel(state),
    enabled: state.cart.size > 0 && canPlan(state),
    action: UserAction.ReviewCleanup,
  };
}

function emptyParts(state: AppState): readonly ActionBarPart[] {
  const safe = sizeOfGroup(state.scan.findings, FindingGroup.Safe);
  const intro = [
    words(UiCopy.actionBar.nothingSelected),
    words(` ${UiCopy.actionBar.pressToSelect(keyLabel[UserAction.ToggleCleanup])}`),
  ];
  if (safe.isZero()) return intro;
  return [
    ...intro,
    words(" "),
    link(UiCopy.actionBar.selectAllSafe(formatByteSize(safe)), UserAction.SelectAllSafe),
  ];
}

function selectedParts(state: AppState): readonly ActionBarPart[] {
  const entries = [...state.cart.values()];
  const hasHighRisk = entries.some((entry) => entry.kind === CartEntryKind.HighRisk);
  const color = hasHighRisk ? ColorRole.danger : ColorRole.safe;
  return [
    strong(UiCopy.actionBar.selected(formatByteSize(totalSizeOf(entries))), color),
    words(
      `${Glyph.separator}${UiCopy.actionBar.items(formatCount(entries.length), entries.length)}`,
    ),
    ...(hasHighRisk
      ? [words(`${Glyph.separator}${UiCopy.actionBar.includesHighRisk}`, ColorRole.danger)]
      : []),
    words(
      `${Glyph.separator}${canPlan(state) ? UiCopy.actionBar.confirmNote : UiCopy.actionBar.waitingForFirstResults}`,
    ),
  ];
}

function partsFor(state: AppState): readonly ActionBarPart[] {
  if (state.notice !== undefined) return [words(state.notice, ColorRole.caution)];
  if (state.scan.status === ScanStatus.Failed) return [words(UiCopy.actionBar.scanFailed)];
  if (state.cart.size === 0) {
    return emptyParts(state);
  }
  return selectedParts(state);
}

const BUTTON_FRAME_WIDTH = 6;
const BUTTON_GAP_WIDTH = 2;

/** Drops words from the end until the line leaves room for the button; the first part always stays. */
function fitted(
  parts: readonly ActionBarPart[],
  columns: number,
  button: ActionBarButton | undefined,
): readonly ActionBarPart[] {
  const buttonWidth =
    button === undefined ? 0 : button.key.length + button.label.length + BUTTON_FRAME_WIDTH;
  const room = columns - Layout.horizontalPadding - buttonWidth - BUTTON_GAP_WIDTH;
  const widthOf = (list: readonly ActionBarPart[]): number =>
    list.reduce((total, part) => total + part.text.length, 0);
  let shown = parts;
  while (shown.length > 1 && widthOf(shown) > room) shown = shown.slice(0, shown.length - 1);
  const [first] = shown;
  return shown.length === 1 && first !== undefined && first.text.length > room
    ? [{ ...first, text: truncate(first.text, Math.max(1, room)) }]
    : shown;
}

export function actionBarView(
  state: AppState,
  viewport: Viewport,
  density: Density,
): ActionBarView {
  const barButton = state.scan.status === ScanStatus.Failed ? undefined : button(state);
  return {
    rule: hasRules(density) ? Glyph.rule.repeat(Math.max(0, viewport.columns)) : undefined,
    parts: fitted(partsFor(state), viewport.columns, barButton),
    button: barButton,
  };
}
