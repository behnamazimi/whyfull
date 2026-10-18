import { describe, expect, test } from "bun:test";
import { DiagnosisUpdateKind, type DiagnosisReport } from "../../src/application/index.ts";
import {
  atPath,
  BlockReason,
  ByteSize,
  Category,
  classify,
  CleanupActionKind,
  defaultDiagnosisPolicy,
  defineRule,
  diagnose,
  emptyTrash,
  RuleId,
  RuleIndex,
  SafetyLevel,
  PathTemplate,
  type CleanupPlan,
  type CleanupReport,
} from "../../src/domain/index.ts";
import { UiCopy } from "../../src/presentation/copy/ui-copy.ts";
import { UserAction } from "../../src/presentation/keymap.ts";
import { AppEventKind, EffectKind } from "../../src/presentation/tui/state/app-event.ts";
import { CleanupPhase, initialAppState } from "../../src/presentation/tui/state/app-state.ts";
import { reduce } from "../../src/presentation/tui/state/reducer.ts";
import { ScreenKind } from "../../src/presentation/tui/state/screen.ts";
import { cleanupReportView } from "../../src/presentation/tui/view-models/cleanup-view.ts";
import { keyStripView } from "../../src/presentation/tui/view-models/key-strip-view.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { buildTree, pathOf, REFERENCE_DATE } from "../support/domain-builders.ts";
import { SAMPLE_HOME } from "../support/report-builder.ts";

const TRASH_GB = 1;
const MOVED_GB = 3;
const VIEWPORT = { columns: 100, rows: 30 };

const trashRule = defineRule({
  id: RuleId.Trash,
  category: Category.Trash,
  locator: atPath(PathTemplate.underHome(".Trash")),
  safety: SafetyLevel.NeedsReview,
  remedy: emptyTrash(),
});

const home = buildTree(SAMPLE_HOME.toString(), {
  children: [{ name: ".Trash", ownFilesSize: ByteSize.fromGigabytes(TRASH_GB) }],
});
const index = RuleIndex.build([trashRule], { home: SAMPLE_HOME });
if (!index.ok) throw new Error("rules must be unique");
const classification = classify(home, index.value);
const report: DiagnosisReport = {
  snapshot: { root: home, issues: [], startedAt: REFERENCE_DATE, finishedAt: REFERENCE_DATE },
  classification,
  findings: diagnose({
    root: home,
    classification,
    policy: defaultDiagnosisPolicy,
    now: REFERENCE_DATE,
  }),
};

const cleanupReport = (movedGb: number): CleanupReport => ({
  results: [],
  removedSize: ByteSize.zero,
  movedToTrashSize: ByteSize.fromGigabytes(movedGb),
  highRiskRemovedSize: ByteSize.zero,
  measuredFreeSpaceGain: undefined,
});

const scanned = reduce(initialAppState(sampleAppContext), {
  kind: AppEventKind.DiagnosisUpdated,
  update: { kind: DiagnosisUpdateKind.Completed, report },
}).state;
const afterMoving = (movedGb: number) =>
  reduce(scanned, { kind: AppEventKind.CleanupFinished, report: cleanupReport(movedGb) }).state;

describe("emptying the Trash after items were moved there", () => {
  test("is offered on the report, in the words and the keys", () => {
    const state = afterMoving(MOVED_GB);
    expect(cleanupReportView(state).summary).toContain(UiCopy.cleanup.emptyTrashOffer);
    expect(keyStripView(state, VIEWPORT).hints.map((hint) => hint.label)).toContain(
      UiCopy.cleanup.emptyTrashAction,
    );
  });

  test("is not offered when nothing went to the Trash", () => {
    const state = afterMoving(0);
    expect(cleanupReportView(state).summary).not.toContain(UiCopy.cleanup.emptyTrashOffer);
    expect(
      reduce(state, { kind: AppEventKind.ActionRequested, action: UserAction.ConfirmCleanup })
        .effects,
    ).toEqual([]);
  });

  test("opens a review of emptying the whole Trash, counting what was just moved", () => {
    const result = reduce(afterMoving(MOVED_GB), {
      kind: AppEventKind.ActionRequested,
      action: UserAction.ConfirmCleanup,
    });
    expect(result.state.screen.kind).toBe(ScreenKind.CleanupReview);
    const [effect] = result.effects;
    if (effect?.kind !== EffectKind.PlanCleanup) throw new Error("expected a plan to be made");
    expect(effect.draft.actions).toEqual([
      {
        kind: CleanupActionKind.EmptyTrash,
        path: pathOf("/Users/sam/.Trash"),
        rule: trashRule,
        size: ByteSize.fromGigabytes(TRASH_GB + MOVED_GB),
      },
    ]);
  });
});

describe("checking a review again", () => {
  const blockedPlan: CleanupPlan = {
    actions: [],
    blocked: [
      {
        paths: [pathOf("/Users/sam/Library/Caches/Notion")],
        rule: undefined,
        size: ByteSize.fromGigabytes(1),
        reason: BlockReason.AppRunning,
        detail: "Notion",
      },
    ],
  };

  test("plans the same cleanup again, and shows the key only when an app or tool was the reason", () => {
    const reviewing = reduce(
      reduce(afterMoving(MOVED_GB), {
        kind: AppEventKind.ActionRequested,
        action: UserAction.ConfirmCleanup,
      }).state,
      { kind: AppEventKind.CleanupPlanned, plan: blockedPlan },
    ).state;
    expect(reviewing.cleanup.phase).toBe(CleanupPhase.Reviewing);
    expect(keyStripView(reviewing, VIEWPORT).hints.map((hint) => hint.label)).toContain(
      UiCopy.cleanup.recheckAction,
    );
    const again = reduce(reviewing, {
      kind: AppEventKind.ActionRequested,
      action: UserAction.Recheck,
    });
    expect(again.effects.map((effect) => effect.kind)).toEqual([EffectKind.PlanCleanup]);
    expect(again.state.screen.kind).toBe(ScreenKind.CleanupReview);
  });
});
