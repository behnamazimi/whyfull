import { describe, expect, test } from "bun:test";
import { DiagnosisUpdateKind } from "../../src/application/index.ts";
import { ByteSize, type CleanupReport } from "../../src/domain/index.ts";
import { UiCopy } from "../../src/presentation/copy/ui-copy.ts";
import { UserAction } from "../../src/presentation/keymap.ts";
import { cleanupSummaryText } from "../../src/presentation/report/cleanup-summary.ts";
import {
  AppEventKind,
  EffectKind,
  type AppEvent,
} from "../../src/presentation/tui/state/app-event.ts";
import { initialAppState } from "../../src/presentation/tui/state/app-state.ts";
import { reduce } from "../../src/presentation/tui/state/reducer.ts";
import { footerView } from "../../src/presentation/tui/view-models/footer-view.ts";
import { buildTree } from "../support/domain-builders.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { reportFor, SAMPLE_HOME } from "../support/report-builder.ts";

const ROOMY = { columns: 120, rows: 40 };
const FREED_GIGABYTES = 4;
const REMOVED_GIGABYTES = 3;
const TRASHED_GIGABYTES = 2;

const cleanup = (overrides: Partial<CleanupReport>): CleanupReport => ({
  results: [],
  removedSize: ByteSize.zero,
  movedToTrashSize: ByteSize.zero,
  highRiskRemovedSize: ByteSize.zero,
  measuredFreeSpaceGain: undefined,
  ...overrides,
});

describe("cleanupSummaryText", () => {
  test("uses the measured gain when there is one", () => {
    const text = cleanupSummaryText(
      cleanup({
        measuredFreeSpaceGain: ByteSize.fromGigabytes(FREED_GIGABYTES),
        removedSize: ByteSize.fromGigabytes(REMOVED_GIGABYTES),
      }),
    );
    expect(text).toContain("I freed 4.0 GB");
    expect(text).not.toContain("3.0 GB");
    expect(text).toContain(UiCopy.cleanup.share.about);
  });

  test("falls back to the removed size when the gain could not be measured", () => {
    const text = cleanupSummaryText(
      cleanup({ removedSize: ByteSize.fromGigabytes(REMOVED_GIGABYTES) }),
    );
    expect(text).toContain("I freed 3.0 GB");
  });

  test("says moved, not freed, when everything went to the Trash", () => {
    const text = cleanupSummaryText(
      cleanup({ movedToTrashSize: ByteSize.fromGigabytes(TRASHED_GIGABYTES) }),
    );
    expect(text).toContain("moved 2.0 GB to the Trash");
    expect(text).not.toContain("freed");
  });

  test("has nothing to share when no space came back and nothing was trashed", () => {
    expect(cleanupSummaryText(cleanup({}))).toBeUndefined();
  });
});

describe("copy summary key", () => {
  const report = reportFor(buildTree(SAMPLE_HOME.toString(), { children: [] }));
  const completed: AppEvent = {
    kind: AppEventKind.DiagnosisUpdated,
    update: { kind: DiagnosisUpdateKind.Completed, report },
  };
  const finished = (summary: CleanupReport): AppEvent => ({
    kind: AppEventKind.CleanupFinished,
    report: summary,
  });
  const copyKey: AppEvent = { kind: AppEventKind.ActionRequested, action: UserAction.CopySummary };

  function afterCleanup(summary: CleanupReport): ReturnType<typeof reduce> {
    const scanned = reduce(initialAppState(sampleAppContext), completed).state;
    return reduce(reduce(scanned, finished(summary)).state, copyKey);
  }

  test("copies the summary from the finished screen", () => {
    const { effects } = afterCleanup(
      cleanup({ measuredFreeSpaceGain: ByteSize.fromGigabytes(FREED_GIGABYTES) }),
    );
    expect(effects.map((effect) => effect.kind)).toEqual([EffectKind.CopyToClipboard]);
  });

  test("tells the person when there is nothing to share", () => {
    const { state, effects } = afterCleanup(cleanup({}));
    expect(effects).toEqual([]);
    expect(state.notice).toBe(UiCopy.notices.nothingToShare);
  });

  test("does nothing on other screens", () => {
    const scanned = reduce(initialAppState(sampleAppContext), completed).state;
    const { state, effects } = reduce(scanned, copyKey);
    expect(effects).toEqual([]);
    expect(state.notice).toBe(scanned.notice);
  });

  test("confirms with its own notice once copied", () => {
    const scanned = reduce(initialAppState(sampleAppContext), completed).state;
    const onReport = reduce(scanned, finished(cleanup({}))).state;
    const { state } = reduce(onReport, { kind: AppEventKind.ClipboardCopied });
    expect(state.notice).toBe(UiCopy.notices.summaryCopied);
  });

  test("offers the key on the finished screen", () => {
    const scanned = reduce(initialAppState(sampleAppContext), completed).state;
    const onReport = reduce(scanned, finished(cleanup({}))).state;
    const hints = footerView(onReport, ROOMY).hintRows.flat();
    expect(hints.map((item) => item.label)).toContain(UiCopy.actions[UserAction.CopySummary]);
  });
});
