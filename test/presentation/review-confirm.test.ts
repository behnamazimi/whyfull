import { describe, expect, test } from "bun:test";
import {
  AbsolutePath,
  ByteSize,
  CleanupActionKind,
  OutcomeKind,
  type ApprovedAction,
} from "../../src/domain/index.ts";
import { UiCopy } from "../../src/presentation/copy/ui-copy.ts";
import { UserAction } from "../../src/presentation/keymap.ts";
import { AppEventKind, EffectKind } from "../../src/presentation/tui/state/app-event.ts";
import { CleanupPhase, initialAppState } from "../../src/presentation/tui/state/app-state.ts";
import { reduce } from "../../src/presentation/tui/state/reducer.ts";
import { ScreenKind, initialScreen } from "../../src/presentation/tui/state/screen.ts";
import { Glyph } from "../../src/presentation/theme.ts";
import { Layout } from "../../src/presentation/tui/view-models/layout.ts";
import { cleanupReviewView } from "../../src/presentation/tui/view-models/cleanup-view.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { SAMPLE_HOME } from "../support/report-builder.ts";
import { installersRule, nodeModulesRule } from "../support/sample-rules.ts";

const ROOMY = { columns: 120, rows: 40 };
const DEVICE = 1;

const identity = (inode: number) => ({ device: DEVICE, inode, isSymbolicLink: false });
const at = (...segments: string[]) =>
  AbsolutePath.fromSegments([...SAMPLE_HOME.segments, ...segments]);

const deleted: ApprovedAction = {
  kind: CleanupActionKind.Delete,
  path: at("app", "node_modules"),
  rule: nodeModulesRule,
  size: ByteSize.fromMegabytes(300),
  identity: identity(1),
};
const trashed: ApprovedAction = {
  kind: CleanupActionKind.MoveToTrash,
  path: at("Downloads", "setup.dmg"),
  rule: installersRule,
  size: ByteSize.fromMegabytes(800),
  identity: identity(2),
};

const reviewing = {
  ...initialAppState(sampleAppContext),
  screen: { kind: ScreenKind.CleanupReview, previous: initialScreen } as const,
  cleanup: {
    phase: CleanupPhase.Reviewing,
    plan: { actions: [deleted, trashed], blocked: [] },
    typed: "",
  } as const,
};

const press = (action: UserAction) =>
  reduce(reviewing, { kind: AppEventKind.ActionRequested, action });

describe("confirming a cleanup", () => {
  test("Enter does not start it", () => {
    expect(press(UserAction.Open).effects).toEqual([]);
  });

  test("y starts it", () => {
    const { effects, state } = press(UserAction.ConfirmCleanup);
    expect(effects.map((effect) => effect.kind)).toEqual([EffectKind.RunCleanup]);
    expect(state.cleanup.phase).toBe(CleanupPhase.Running);
  });

  test("y does nothing outside the review screen", () => {
    const { effects } = reduce(initialAppState(sampleAppContext), {
      kind: AppEventKind.ActionRequested,
      action: UserAction.ConfirmCleanup,
    });
    expect(effects).toEqual([]);
  });
});

describe("review groups", () => {
  test("say separately what is deleted and what goes to the Trash", () => {
    const { groups } = cleanupReviewView(reviewing, ROOMY);
    expect(groups.map((group) => group.consequence).sort()).toEqual(
      [UiCopy.cleanup.consequences.delete, UiCopy.cleanup.consequences["move-to-trash"]].sort(),
    );
    expect(groups[0]?.size.trim()).toBe("800 MB");
  });
});

describe("progress while cleaning", () => {
  const running = (finished: number) => ({
    ...reviewing,
    cleanup: {
      phase: CleanupPhase.Running,
      plan: { actions: [deleted, trashed], blocked: [] },
      results: [
        { action: deleted, outcome: OutcomeKind.Done, freed: deleted.size, detail: undefined },
      ].slice(0, finished),
    } as const,
  });

  test("shows an empty bar before any action finishes", () => {
    const { progressBar } = cleanupReviewView(running(0), ROOMY);
    expect(progressBar).toBe(Glyph.barEmpty.repeat(Layout.progressBarWidth));
  });

  test("fills the bar in proportion to the finished actions", () => {
    const { progressBar } = cleanupReviewView(running(1), ROOMY);
    const filled = Layout.progressBarWidth / 2;
    expect(progressBar).toBe(
      Glyph.barFull.repeat(filled) + Glyph.barEmpty.repeat(Layout.progressBarWidth - filled),
    );
  });

  test("shows no bar while reviewing", () => {
    expect(cleanupReviewView(reviewing, ROOMY).progressBar).toBeUndefined();
  });
});
