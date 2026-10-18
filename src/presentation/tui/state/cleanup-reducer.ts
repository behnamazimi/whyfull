import type { DiagnosisReport } from "../../../application/index.ts";
import {
  CartEntryKind,
  CleanupActionKind,
  OutcomeKind,
  pathsOf,
  type AbsolutePath,
  draftCleanup,
  isHighRiskAction,
  type CartEntry,
  type Classification,
  type CleanupReport,
  type Removal,
} from "../../../domain/index.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { EffectKind } from "./app-event.ts";
import {
  CleanupPhase,
  idleCleanup,
  noRevision,
  ScanStatus,
  type AppState,
  type PendingRevision,
} from "./app-state.ts";
import { initialScreen, ScreenKind, type Screen } from "./screen.ts";
import { cleanupTargetOnScreen, CleanupTargetKind } from "./cleanup-target.ts";
import { trashEntryAfterCleanup } from "./trash-offer.ts";
import { toggleHighRisk } from "./high-risk-reducer.ts";
import { stay, withEffect, withNotice, type Transition } from "./transition.ts";

export const toCartEntry = (item: Classification): CartEntry => ({
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

/** The finished scan, or while it runs, what it has measured completely so far. */
const reportToPlanFrom = (state: AppState): DiagnosisReport | undefined => {
  const { scan } = state;
  switch (scan.status) {
    case ScanStatus.Completed:
      return scan.report;
    case ScanStatus.Running:
      return scan.preview;
    case ScanStatus.Failed:
      return undefined;
  }
};

/** From the cleanup report: reviews emptying the Trash, which gives back what was moved there. */
export function offerEmptyTrash(state: AppState): Transition {
  const entry = trashEntryAfterCleanup(state);
  if (entry === undefined) return stay(state);
  return reviewCleanup({
    ...state,
    cart: new Map([[entry.path.toString(), entry]]),
    cleanup: idleCleanup,
    screen: initialScreen,
  });
}

export function reviewCleanup(state: AppState): Transition {
  if (state.cart.size === 0) return withNotice(state, UiCopy.cleanup.emptyCart);
  const report = reportToPlanFrom(state);
  if (report === undefined) return withNotice(state, UiCopy.notices.cleanupAfterScan);
  const draft = draftCleanup({
    entries: [...state.cart.values()],
    root: report.snapshot.root,
    classification: report.classification,
    highRiskLimits: state.context.highRiskLimits,
    protectedLocations: state.context.protectedLocations,
  });
  const previous =
    state.screen.kind === ScreenKind.CleanupReview ? state.screen.previous : state.screen;
  const screen: Screen = { kind: ScreenKind.CleanupReview, previous };
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

/**
 * What the finished cleanup took out of the tree. Folders a tool changed in ways that can't be
 * told in advance, and folders only partly deleted, are measured again.
 */
function revisionAfter(report: CleanupReport): PendingRevision {
  const removals: Removal[] = [];
  const remeasure: AbsolutePath[] = [];
  for (const { action, outcome, freed } of report.results) {
    if (outcome === OutcomeKind.Done && action.kind !== CleanupActionKind.RunOwnerTool) {
      removals.push({ path: action.path, size: freed });
    } else if (outcome === OutcomeKind.Done || outcome === OutcomeKind.PartlyDeleted) {
      remeasure.push(...pathsOf(action));
    }
  }
  return { removals, remeasure };
}

const isEmptyRevision = (revision: PendingRevision): boolean =>
  revision.removals.length === 0 && revision.remeasure.length === 0;

/**
 * Back to the list after a cleanup. The scan already knows everything else, so only what the
 * cleanup changed is taken out, not measured from scratch.
 */
export function finishCleanup(state: AppState): Transition {
  const { cleanup, scan } = state;
  const revision =
    cleanup.phase === CleanupPhase.Finished ? revisionAfter(cleanup.report) : noRevision;
  const back: AppState = { ...state, cleanup: idleCleanup, screen: initialScreen };
  if (isEmptyRevision(revision)) return stay(back);
  switch (scan.status) {
    case ScanStatus.Completed:
      return withEffect(back, {
        kind: EffectKind.RefreshScan,
        report: scan.report,
        removals: revision.removals,
        remeasure: revision.remeasure,
      });
    case ScanStatus.Running:
      return stay({
        ...back,
        pendingRevision: {
          removals: [...state.pendingRevision.removals, ...revision.removals],
          remeasure: [...state.pendingRevision.remeasure, ...revision.remeasure],
        },
      });
    case ScanStatus.Failed:
      return stay(back);
  }
}
