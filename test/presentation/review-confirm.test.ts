import { describe, expect, test } from "bun:test";
import {
  AbsolutePath,
  BlockReason,
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
import { Layout, shareBar } from "../../src/presentation/tui/view-models/layout.ts";
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

describe("review sections", () => {
  test("say separately what is deleted and what goes to the Trash", () => {
    const { sections } = cleanupReviewView(reviewing, ROOMY);
    expect(sections.map((section) => section.header.title)).toEqual([
      UiCopy.cleanup.sections.delete.title,
      UiCopy.cleanup.sections["move-to-trash"].title,
    ]);
    expect(sections[1]?.items[0]?.size.trim()).toBe("800 MB");
  });

  test("the bar compares each item with the largest one", () => {
    const { sections } = cleanupReviewView(reviewing, ROOMY);
    expect(sections[0]?.items[0]?.bar.startsWith(Glyph.barFull)).toBe(true);
    expect(sections[1]?.items[0]?.bar).toBe(shareBar(1));
  });
});

describe("blocked items", () => {
  const blockedBy = (reason: BlockReason, detail: string | undefined) => ({
    ...reviewing,
    cleanup: {
      ...reviewing.cleanup,
      plan: {
        actions: [deleted],
        blocked: [
          {
            paths: [at("Library", "Notion")],
            rule: undefined,
            size: ByteSize.fromGigabytes(1),
            reason,
            detail,
          },
        ],
      },
    } as const,
  });

  test("an open app is named", () => {
    const { blocked } = cleanupReviewView(blockedBy(BlockReason.AppRunning, "Notion"), ROOMY);
    expect(blocked?.rows[0]?.reason).toBe(UiCopy.cleanup.appRunning("Notion"));
  });

  test("falls back to the general reason when the app is unknown", () => {
    const { blocked } = cleanupReviewView(blockedBy(BlockReason.AppRunning, undefined), ROOMY);
    expect(blocked?.rows[0]?.reason).toBe(UiCopy.cleanup.blockReasons[BlockReason.AppRunning]);
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
