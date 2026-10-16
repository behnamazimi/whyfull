import {
  CartEntryKind,
  draftCleanup,
  FindingKind,
  isHighRiskAction,
  isStale,
  type CartEntry,
  type Classification,
  type Finding,
} from "../../../domain/index.ts";
import { isCleanableByWhyfull } from "../../copy/rule-labels.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { EffectKind } from "./app-event.ts";
import { CleanupPhase, idleCleanup, ScanStatus, type AppState } from "./app-state.ts";
import { ScreenKind, type Screen } from "./screen.ts";
import { cleanupTargetOnScreen, CleanupTargetKind } from "./cleanup-target.ts";
import { toggleHighRisk } from "./high-risk-reducer.ts";
import { findingAt } from "./selectors.ts";
import { restartScan, stay, withEffect, withNotice, type Transition } from "./transition.ts";

const toCartEntry = (item: Classification): CartEntry => ({
  kind: CartEntryKind.Recognized,
  path: item.path,
  rule: item.rule,
  size: item.size,
});

export function toggleCleanup(state: AppState): Transition {
  const target = cleanupTargetOnScreen(state);
  switch (target.kind) {
    case CleanupTargetKind.Nothing:
      return stay(state);
    case CleanupTargetKind.ManualOnly:
      return withNotice(state, UiCopy.cleanup.manualOnly);
    case CleanupTargetKind.NotScannedYet:
      return withNotice(state, UiCopy.notices.waitForScan);
    case CleanupTargetKind.HighRisk:
      return toggleHighRisk(state, target.entry, target.invitation);
    case CleanupTargetKind.Recognized:
      return toggleRecognized(state, target.items);
  }
}

function toggleRecognized(state: AppState, items: readonly Classification[]): Transition {
  const cart = new Map(state.cart);
  const allSelected = items.every((item) => cart.has(item.path.toString()));
  for (const item of items) {
    if (allSelected) cart.delete(item.path.toString());
    else cart.set(item.path.toString(), toCartEntry(item));
  }
  return stay({ ...state, cart });
}

function findingOnScreen(state: AppState): Finding | undefined {
  const { screen } = state;
  switch (screen.kind) {
    case ScreenKind.Diagnosis:
      return findingAt(state, screen.selected);
    case ScreenKind.FindingDetail:
      return findingAt(state, screen.findingIndex);
    case ScreenKind.Folders:
    case ScreenKind.PromptPreview:
    case ScreenKind.Help:
    case ScreenKind.DiskOverview:
    case ScreenKind.PermissionGuide:
    case ScreenKind.CleanupReview:
    case ScreenKind.CleanupReport:
    case ScreenKind.Growth:
    case ScreenKind.HighRiskIntro:
      return undefined;
  }
}

export function selectStale(state: AppState): Transition {
  const finding = findingOnScreen(state);
  if (finding === undefined) return stay(state);
  if (finding.kind !== FindingKind.KnownItem) {
    return withNotice(state, UiCopy.cleanup.onlyKnownItems);
  }
  if (!isCleanableByWhyfull(finding.rule)) return withNotice(state, UiCopy.cleanup.manualOnly);
  if (state.scan.status !== ScanStatus.Completed) {
    return withNotice(state, UiCopy.notices.waitForScan);
  }
  const { finishedAt } = state.scan.report.snapshot;
  const { staleAfter } = state.context.diagnosisPolicy;
  const old = finding.locations.filter((place) => isStale(place, finishedAt, staleAfter));
  if (old.length === 0) return withNotice(state, UiCopy.cleanup.nothingOld);
  const cart = new Map(state.cart);
  for (const place of old) cart.set(place.path.toString(), toCartEntry(place));
  return stay({ ...state, cart });
}

export function reviewCleanup(state: AppState): Transition {
  if (state.cart.size === 0) return withNotice(state, UiCopy.cleanup.emptyCart);
  if (state.scan.status !== ScanStatus.Completed) {
    return withNotice(state, UiCopy.notices.waitForScan);
  }
  const { report } = state.scan;
  const draft = draftCleanup({
    entries: [...state.cart.values()],
    root: report.snapshot.root,
    classification: report.classification,
    highRiskLimits: state.context.highRiskLimits,
    protectedLocations: state.context.protectedLocations,
  });
  const screen: Screen = { kind: ScreenKind.CleanupReview, previous: state.screen };
  return withEffect(
    { ...state, screen, cleanup: { phase: CleanupPhase.Planning } },
    { kind: EffectKind.PlanCleanup, draft, scanRoot: state.scope.root },
  );
}

export function confirmCleanup(state: AppState): Transition {
  const { cleanup } = state;
  if (cleanup.phase !== CleanupPhase.Reviewing || cleanup.plan.actions.length === 0) {
    return stay(state);
  }
  const wordTyped = cleanup.typed.toLowerCase() === UiCopy.cleanup.confirmationWord;
  if (cleanup.plan.actions.some(isHighRiskAction) && !wordTyped) return stay(state);
  return withEffect(
    { ...state, cleanup: { phase: CleanupPhase.Running, plan: cleanup.plan, results: [] } },
    { kind: EffectKind.RunCleanup, plan: cleanup.plan, volume: state.scope.root },
  );
}

export function typeConfirmation(state: AppState, character: string): Transition {
  const { cleanup } = state;
  if (cleanup.phase !== CleanupPhase.Reviewing) return stay(state);
  if (cleanup.typed.length >= UiCopy.cleanup.confirmationWord.length) return stay(state);
  return stay({ ...state, cleanup: { ...cleanup, typed: cleanup.typed + character } });
}

export function eraseConfirmation(state: AppState): Transition {
  const { cleanup } = state;
  if (cleanup.phase !== CleanupPhase.Reviewing) return stay(state);
  return stay({
    ...state,
    cleanup: { ...cleanup, typed: cleanup.typed.slice(0, cleanup.typed.length - 1) },
  });
}

export function leaveCleanupReview(state: AppState, previous: Screen): Transition {
  if (state.cleanup.phase === CleanupPhase.Running) return stay(state);
  return stay({ ...state, cleanup: idleCleanup, screen: previous });
}

export function finishCleanup(state: AppState): Transition {
  return restartScan({ ...state, cleanup: idleCleanup }, state.scope);
}
