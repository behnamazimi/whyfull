import { describe, expect, test } from "bun:test";
import { DiagnosisUpdateKind } from "../../src/application/index.ts";
import {
  ByteSize,
  CleanupActionKind,
  OutcomeKind,
  type ActionResult,
  type ApprovedAction,
  type CleanupReport,
} from "../../src/domain/index.ts";
import { UserAction } from "../../src/presentation/keymap.ts";
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
import { ScreenKind } from "../../src/presentation/tui/state/screen.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { buildTree, nextIdentity, pathOf } from "../support/domain-builders.ts";
import { reportFor, SAMPLE_HOME } from "../support/report-builder.ts";
import { homebrewCacheRule } from "../support/sample-rules.ts";

const HOMEBREW_GB = 3;
const home = buildTree(SAMPLE_HOME.toString(), {
  children: [
    {
      name: "Library",
      children: [
        {
          name: "Caches",
          children: [{ name: "Homebrew", ownFilesSize: ByteSize.fromGigabytes(HOMEBREW_GB) }],
        },
      ],
    },
  ],
});
const report = reportFor(home);
const homebrew = pathOf("/Users/sam/Library/Caches/Homebrew");

const deleted: ApprovedAction = {
  kind: CleanupActionKind.Delete,
  path: homebrew,
  rule: homebrewCacheRule,
  size: ByteSize.fromGigabytes(HOMEBREW_GB),
  identity: nextIdentity(),
};
const result = (outcome: OutcomeKind): ActionResult => ({
  action: deleted,
  outcome,
  freed: deleted.size,
  detail: undefined,
  problem: undefined,
});
const reportOf = (...results: readonly ActionResult[]): CleanupReport => ({
  results,
  removedSize: ByteSize.sum(results.map((item) => item.freed)),
  movedToTrashSize: ByteSize.zero,
  highRiskRemovedSize: ByteSize.zero,
  measuredFreeSpaceGain: undefined,
});

const completed: AppEvent = {
  kind: AppEventKind.DiagnosisUpdated,
  update: { kind: DiagnosisUpdateKind.Completed, report },
};
const preliminary: AppEvent = {
  kind: AppEventKind.DiagnosisUpdated,
  update: { kind: DiagnosisUpdateKind.PreliminaryFindings, report },
};
const finished = (...results: readonly ActionResult[]): AppEvent => ({
  kind: AppEventKind.CleanupFinished,
  report: reportOf(...results),
});
const backToList: AppEvent = { kind: AppEventKind.ActionRequested, action: UserAction.Open };

function play(...events: readonly AppEvent[]): { state: AppState; effects: readonly Effect[] } {
  let state = initialAppState(sampleAppContext);
  let effects: readonly Effect[] = [];
  for (const event of events) {
    const transition = reduce(state, event);
    state = transition.state;
    effects = transition.effects;
  }
  return { state, effects };
}

describe("going back to the list after a cleanup", () => {
  test("takes out what was removed instead of scanning everything again", () => {
    const back = play(completed, finished(result(OutcomeKind.Done)), backToList);
    expect(back.state.screen.kind).toBe(ScreenKind.Diagnosis);
    expect(back.state.cleanup.phase).toBe(CleanupPhase.Idle);
    expect(back.effects).toHaveLength(1);
    const [effect] = back.effects;
    expect(effect).toMatchObject({ kind: EffectKind.RefreshScan, report });
    expect(effect?.kind === EffectKind.RefreshScan && effect.removals).toEqual([
      { path: homebrew, size: deleted.size },
    ]);
  });

  test("measures a partly deleted folder again instead of dropping it", () => {
    const back = play(completed, finished(result(OutcomeKind.PartlyDeleted)), backToList);
    const [effect] = back.effects;
    expect(effect?.kind === EffectKind.RefreshScan && effect.removals).toEqual([]);
    expect(effect?.kind === EffectKind.RefreshScan && effect.remeasure).toEqual([homebrew]);
  });

  test("does nothing when nothing was cleaned", () => {
    const back = play(completed, finished(result(OutcomeKind.Failed)), backToList);
    expect(back.effects).toEqual([]);
  });

  test("keeps what a cleanup removed during the scan, and applies it when the scan ends", () => {
    const during = play(preliminary, finished(result(OutcomeKind.Done)), backToList);
    expect(during.effects).toEqual([]);
    expect(during.state.pendingRevision.removals).toHaveLength(1);
    const ended = reduce(during.state, completed);
    expect(ended.effects.map((effect) => effect.kind)).toEqual([EffectKind.RefreshScan]);
    expect(ended.state.pendingRevision.removals).toEqual([]);
  });

  test("shows the revised result when the refresh arrives", () => {
    const refreshed = reduce(play(completed).state, {
      kind: AppEventKind.ScanRefreshed,
      report: reportFor(buildTree(SAMPLE_HOME.toString(), {})),
    });
    expect(refreshed.state.scan.findings).toEqual([]);
  });
});
