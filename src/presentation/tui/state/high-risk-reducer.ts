import {
  CartEntryKind,
  checkHighRisk,
  highRiskWarnings,
  type HighRiskBlock,
  type HighRiskEntry,
} from "../../../domain/index.ts";
import { ruleCopy } from "../../copy/rule-copy.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { EffectKind } from "./app-event.ts";
import { ScanStatus, type AppState } from "./app-state.ts";
import { cleanupTargetOnScreen, CleanupTargetKind } from "./cleanup-target.ts";
import { DialogKey } from "../../keymap.ts";
import { ScreenKind, type Screen } from "./screen.ts";
import { stay, withEffect, withNotice, withScreen, type Transition } from "./transition.ts";

const SENTENCE_SEPARATOR = " ";

export function highRiskBlockOf(state: AppState, entry: HighRiskEntry): HighRiskBlock | undefined {
  const { context, scan } = state;
  return checkHighRisk({
    target: entry.path,
    limits: context.highRiskLimits,
    protectedLocations: context.protectedLocations,
    classifications:
      scan.status === ScanStatus.Completed ? scan.report.classification.classifications : [],
  });
}

export function blockedNotice(block: HighRiskBlock): string {
  const name = block.rule === undefined ? "" : ruleCopy[block.rule.id].title;
  return UiCopy.highRisk.blocked[block.reason](name);
}

export function warningLines(state: AppState, entry: HighRiskEntry): readonly string[] {
  if (state.scan.status !== ScanStatus.Completed) return [];
  const policy = state.context.cleanupPolicy;
  const days = String(policy.recentlyChangedWithin.wholeDays);
  return highRiskWarnings(
    entry,
    state.context.highRiskLimits,
    policy,
    state.scan.report.snapshot.finishedAt,
  ).map((warning) => UiCopy.highRisk.warnings[warning](days));
}

export function toggleHighRisk(
  state: AppState,
  entry: HighRiskEntry,
  invitation: string,
): Transition {
  const block = highRiskBlockOf(state, entry);
  if (block !== undefined) {
    const explainsHowInstead = entry.rule !== undefined && !state.highRiskMode;
    return withNotice(state, explainsHowInstead ? UiCopy.cleanup.manualOnly : blockedNotice(block));
  }
  if (!state.highRiskMode) return withNotice(state, invitation);
  const key = entry.path.toString();
  const cart = new Map(state.cart);
  if (cart.delete(key)) return stay({ ...state, cart });
  cart.set(key, entry);
  const notice = [UiCopy.highRisk.added, ...warningLines(state, entry)].join(SENTENCE_SEPARATOR);
  return withNotice({ ...state, cart }, notice);
}

function pendingEntry(state: AppState): HighRiskEntry | undefined {
  const target = cleanupTargetOnScreen(state);
  if (target.kind !== CleanupTargetKind.HighRisk) return undefined;
  if (highRiskBlockOf(state, target.entry) !== undefined) return undefined;
  return state.cart.has(target.entry.path.toString()) ? undefined : target.entry;
}

function turnOff(state: AppState): Transition {
  const cart = new Map(
    [...state.cart].filter(([, entry]) => entry.kind !== CartEntryKind.HighRisk),
  );
  const removed = state.cart.size - cart.size;
  const notice =
    removed === 0 ? UiCopy.highRisk.turnedOff : UiCopy.highRisk.turnedOffAndRemoved(removed);
  return withEffect(
    { ...state, cart, highRiskMode: false, notice },
    { kind: EffectKind.RecordHighRiskMode, turnedOn: false },
  );
}

/** `x`: opens the dialog that turns high-risk mode on, or turns it off without asking. */
export function toggleHighRiskMode(state: AppState): Transition {
  const { screen } = state;
  switch (screen.kind) {
    case ScreenKind.CleanupReview:
    case ScreenKind.CleanupReport:
      return stay(state);
    case ScreenKind.HighRiskDialog:
      return withScreen(state, screen.previous);
    case ScreenKind.Diagnosis:
    case ScreenKind.FindingDetail:
    case ScreenKind.Folders:
    case ScreenKind.PromptPreview:
    case ScreenKind.Help:
    case ScreenKind.DiskOverview:
    case ScreenKind.PermissionGuide:
    case ScreenKind.Growth:
      if (state.highRiskMode) return turnOff(state);
      return withScreen(state, {
        kind: ScreenKind.HighRiskDialog,
        previous: screen,
        pending: pendingEntry(state),
      });
  }
}

function turnOn(state: AppState, dialog: HighRiskDialog): Transition {
  const cart = new Map(state.cart);
  const { pending } = dialog;
  if (pending !== undefined) cart.set(pending.path.toString(), pending);
  return withEffect(
    {
      ...state,
      cart,
      highRiskMode: true,
      screen: dialog.previous,
      notice: pending === undefined ? UiCopy.highRisk.turnedOn : UiCopy.highRisk.turnedOnAndAdded,
    },
    { kind: EffectKind.RecordHighRiskMode, turnedOn: true },
  );
}

type HighRiskDialog = Extract<Screen, { readonly kind: typeof ScreenKind.HighRiskDialog }>;

export function pressDialogKey(state: AppState, key: DialogKey): Transition {
  const dialog = state.screen;
  if (dialog.kind !== ScreenKind.HighRiskDialog) return stay(state);
  switch (key) {
    case DialogKey.TurnOn:
      return turnOn(state, dialog);
    case DialogKey.Cancel:
      return withScreen(state, dialog.previous);
  }
}
