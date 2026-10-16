import { describe, expect, test } from "bun:test";
import { DiagnosisUpdateKind } from "../../src/application/index.ts";
import {
  BlockReason,
  ByteSize,
  CartEntryKind,
  CleanupActionKind,
  FindingKind,
  type HighRiskAction,
} from "../../src/domain/index.ts";
import { UiCopy } from "../../src/presentation/copy/ui-copy.ts";
import { DialogKey, UserAction } from "../../src/presentation/keymap.ts";
import {
  AppEventKind,
  EffectKind,
  type AppEvent,
  type Effect,
} from "../../src/presentation/tui/state/app-event.ts";
import {
  CleanupPhase,
  initialAppState,
  type AppState,
} from "../../src/presentation/tui/state/app-state.ts";
import { reduce } from "../../src/presentation/tui/state/reducer.ts";
import { initialScreen, ScreenKind } from "../../src/presentation/tui/state/screen.ts";
import { cleanupReviewView } from "../../src/presentation/tui/view-models/cleanup-view.ts";
import { headerView } from "../../src/presentation/tui/view-models/header-view.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { buildTree, nextIdentity } from "../support/domain-builders.ts";
import { reportFor, SAMPLE_HOME } from "../support/report-builder.ts";

const ROOMY = { columns: 120, rows: 40 };

const home = buildTree(SAMPLE_HOME.toString(), {
  children: [
    { name: "VMs", ownFilesSize: ByteSize.fromGigabytes(5) },
    {
      name: "Library",
      children: [
        {
          name: "Mobile Documents",
          children: [{ name: "notes", ownFilesSize: ByteSize.fromGigabytes(2) }],
        },
      ],
    },
  ],
});
const report = reportFor(home);

const unexplainedIndex = (name: string): number =>
  report.findings.findIndex(
    (finding) => finding.kind === FindingKind.UnexplainedFolder && finding.path.name === name,
  );

const action = (userAction: UserAction): AppEvent => ({
  kind: AppEventKind.ActionRequested,
  action: userAction,
});

const completed: AppEvent = {
  kind: AppEventKind.DiagnosisUpdated,
  update: { kind: DiagnosisUpdateKind.Completed, report },
};

const moveTo = (index: number): AppEvent[] =>
  Array.from({ length: index }, () => action(UserAction.MoveDown));

function play(
  start: AppState,
  ...events: readonly AppEvent[]
): { state: AppState; effects: readonly Effect[] } {
  let state = start;
  let effects: readonly Effect[] = [];
  for (const event of events) {
    const transition = reduce(state, event);
    state = transition.state;
    effects = transition.effects;
  }
  return { state, effects };
}

const startingState = initialAppState(sampleAppContext);

const press = (key: DialogKey): AppEvent => ({ kind: AppEventKind.DialogKeyPressed, key });
const turnOnSteps = [press(DialogKey.TurnOn)];
const onVms = [completed, ...moveTo(unexplainedIndex("VMs"))];

describe("turning high-risk mode on and off", () => {
  test("space on an unknown folder invites the person to use high-risk mode", () => {
    const { state } = play(startingState, ...onVms, action(UserAction.ToggleCleanup));
    expect(state.cart.size).toBe(0);
    expect(state.notice).toBe(UiCopy.highRisk.invite);
  });

  test("x opens the dialog, and Enter turns the mode on and adds the folder", () => {
    const dialog = play(startingState, ...onVms, action(UserAction.HighRiskMode));
    expect(dialog.state.screen.kind).toBe(ScreenKind.HighRiskDialog);
    expect(dialog.state.highRiskMode).toBe(false);

    const { state, effects } = play(dialog.state, ...turnOnSteps);
    expect(state.highRiskMode).toBe(true);
    expect(state.screen.kind).toBe(ScreenKind.Diagnosis);
    expect([...state.cart.values()].map((entry) => [entry.kind, entry.path.name])).toEqual([
      [CartEntryKind.HighRisk, "VMs"],
    ]);
    expect(state.notice).toBe(UiCopy.highRisk.turnedOnAndAdded);
    expect(effects).toEqual([{ kind: EffectKind.RecordHighRiskMode, turnedOn: true }]);
    expect(headerView(state, ROOMY).highRisk).toBe(UiCopy.highRisk.badge);
  });

  test("esc closes the dialog and other keys are ignored", () => {
    const dialog = play(startingState, ...onVms, action(UserAction.HighRiskMode));
    const ignored = play(dialog.state, action(UserAction.ConfirmCleanup));
    expect(ignored.state.screen.kind).toBe(ScreenKind.HighRiskDialog);
    const { state, effects } = play(dialog.state, press(DialogKey.Cancel));
    expect(state.screen.kind).toBe(ScreenKind.Diagnosis);
    expect(effects).toEqual([]);
  });

  test("x turns the mode off without asking and takes chosen items out", () => {
    const on = play(startingState, ...onVms, action(UserAction.HighRiskMode), ...turnOnSteps);
    const { state, effects } = play(on.state, action(UserAction.HighRiskMode));
    expect(state.highRiskMode).toBe(false);
    expect(state.cart.size).toBe(0);
    expect(state.notice).toBe(UiCopy.highRisk.turnedOffAndRemoved("1"));
    expect(effects).toEqual([{ kind: EffectKind.RecordHighRiskMode, turnedOn: false }]);
  });

  test("a synced folder stays blocked with a plain reason, even with the mode on", () => {
    const { state } = play(
      startingState,
      completed,
      action(UserAction.HighRiskMode),
      ...turnOnSteps,
      ...moveTo(unexplainedIndex("notes")),
      action(UserAction.ToggleCleanup),
    );
    expect([...state.cart.values()].map((entry) => entry.path.name)).not.toContain("notes");
    expect(state.notice).toBe(UiCopy.highRisk.blocked[BlockReason.SyncedFolder]());
  });
});

describe("confirming high-risk deletions", () => {
  const highRisk: HighRiskAction = {
    kind: CleanupActionKind.DeleteHighRisk,
    path: SAMPLE_HOME.child("VMs"),
    size: ByteSize.fromGigabytes(5),
    fileCount: 3,
    scannedIdentity: nextIdentity(),
    rule: undefined,
  };
  const reviewing: AppState = {
    ...startingState,
    highRiskMode: true,
    screen: { kind: ScreenKind.CleanupReview, previous: initialScreen },
    cleanup: {
      phase: CleanupPhase.Reviewing,
      plan: { actions: [highRisk], blocked: [] },
      typed: "",
    },
  };
  const typed = (text: string): AppEvent[] =>
    Array.from(text, (character) => ({ kind: AppEventKind.ConfirmationTyped, character }));

  test("y alone does not start the cleanup", () => {
    expect(play(reviewing, action(UserAction.ConfirmCleanup)).effects).toEqual([]);
  });

  test("an unfinished word does not start it", () => {
    expect(play(reviewing, ...typed("dele"), action(UserAction.ConfirmCleanup)).effects).toEqual(
      [],
    );
  });

  test("typing the word in any case and confirming starts it", () => {
    const { state, effects } = play(
      reviewing,
      ...typed("DELETE"),
      action(UserAction.ConfirmCleanup),
    );
    expect(effects.map((effect) => effect.kind)).toEqual([EffectKind.RunCleanup]);
    expect(state.cleanup.phase).toBe(CleanupPhase.Running);
  });

  test("backspace erases and extra letters are ignored", () => {
    const { state } = play(
      reviewing,
      ...typed("delx"),
      { kind: AppEventKind.ConfirmationErased },
      ...typed("eteeee"),
    );
    expect(state.cleanup.phase === CleanupPhase.Reviewing && state.cleanup.typed).toBe("delete");
  });

  test("the review lists the chosen items first and asks for the word", () => {
    const view = cleanupReviewView(reviewing, ROOMY);
    expect(view.groups[0]?.heading).toBe(UiCopy.cleanup.highRiskGroup);
    expect(view.confirmation?.prompt).toBe(
      UiCopy.cleanup.typeToConfirm(UiCopy.cleanup.confirmationWord),
    );
  });
});
