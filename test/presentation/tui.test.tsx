import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { TestRendererSetup } from "@opentui/core/testing";
import { testRender } from "@opentui/react/test-utils";
import { act } from "react";
import { DiagnosisUpdateKind } from "../../src/application/index.ts";
import { ByteSize } from "../../src/domain/index.ts";
import { ruleCopy } from "../../src/presentation/copy/rule-copy.ts";
import { UiCopy } from "../../src/presentation/copy/ui-copy.ts";
import { App } from "../../src/presentation/tui/components/app.tsx";
import { AppEventKind, type AppEvent } from "../../src/presentation/tui/state/app-event.ts";
import { initialAppState } from "../../src/presentation/tui/state/app-state.ts";
import { AppStore } from "../../src/presentation/tui/state/app-store.ts";

const noCleanupEvents = (): AsyncIterable<AppEvent> => ({
  [Symbol.asyncIterator]: () => ({
    next: () => Promise.resolve({ done: true, value: undefined }),
  }),
});
import { RuleId } from "../../src/domain/index.ts";
import { buildTree, REFERENCE_DATE } from "../support/domain-builders.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { reportFor, SAMPLE_HOME } from "../support/report-builder.ts";

const TERMINAL = { width: 120, height: 40 };
const PANE_DIVIDER = "│";

const report = reportFor(
  buildTree(SAMPLE_HOME.toString(), {
    children: [
      {
        name: "Library",
        children: [
          {
            name: "Caches",
            ownFilesSize: ByteSize.fromGigabytes(1),
            children: [{ name: "Homebrew", ownFilesSize: ByteSize.fromGigabytes(3) }],
          },
        ],
      },
    ],
  }),
);

describe("TUI", () => {
  let setup: TestRendererSetup;
  let store: AppStore;
  let copied: string[];
  let quitCount: number;

  beforeEach(async () => {
    copied = [];
    quitCount = 0;
    store = new AppStore(initialAppState(sampleAppContext), {
      copyToClipboard: (text): Promise<AppEvent> => {
        copied.push(text);
        return Promise.resolve({ kind: AppEventKind.ClipboardCopied });
      },
      openPermissionSettings: (): Promise<AppEvent> =>
        Promise.resolve({ kind: AppEventKind.SettingsOpened }),
      startScan: () => undefined,
      planCleanup: () => new Promise<never>(() => undefined),
      runCleanup: noCleanupEvents,
      recordHistory: () => ({ kind: AppEventKind.HistoryCompared, diff: undefined }),
      recordHighRiskMode: () => undefined,
      quit: () => {
        quitCount += 1;
      },
    });
    setup = await testRender(<App store={store} clock={{ now: () => REFERENCE_DATE }} />, TERMINAL);
  });

  afterEach(async () => {
    await act(() => setup.dispose());
  });

  const interact = (interaction: () => unknown): Promise<void> =>
    act(async () => {
      await interaction();
    });

  const showReport = (): Promise<void> =>
    interact(() => {
      store.dispatch({
        kind: AppEventKind.DiagnosisUpdated,
        update: { kind: DiagnosisUpdateKind.Completed, report },
      });
    });

  const frameContaining = (text: string): Promise<string> =>
    setup.waitForFrame((frame) => frame.includes(text));

  test("shows the scan in progress, then the diagnosis", async () => {
    await frameContaining(UiCopy.scanning.nothingYet);
    await showReport();
    const frame = await frameContaining(ruleCopy[RuleId.HomebrewCache].title);
    expect(frame).toContain(ruleCopy[RuleId.ApplicationCaches].title);
    expect(frame).toContain("3.0 GB");
  });

  test("navigates with the keyboard and copies a prompt after preview", async () => {
    await showReport();
    await frameContaining(ruleCopy[RuleId.HomebrewCache].title);

    await interact(() => {
      setup.mockInput.pressEnter();
    });
    await frameContaining(UiCopy.detail.whatItIs);

    await interact(() => {
      setup.mockInput.pressKey("a");
    });
    await frameContaining(UiCopy.prompt.title);
    expect(copied).toEqual([]);

    await interact(() => {
      setup.mockInput.pressEnter();
    });
    await frameContaining(UiCopy.notices.copied);
    expect(copied[0]).toContain("~/Library/Caches/Homebrew");

    await interact(() => {
      setup.mockInput.pressKey("q");
    });
    expect(quitCount).toBe(1);
  });

  test("tab narrows the list to one group and back", async () => {
    const withUnrecognized = reportFor(
      buildTree(SAMPLE_HOME.toString(), {
        children: [
          {
            name: "Library",
            children: [
              {
                name: "Caches",
                children: [{ name: "Homebrew", ownFilesSize: ByteSize.fromGigabytes(3) }],
              },
            ],
          },
          { name: "Movies", ownFilesSize: ByteSize.fromGigabytes(2) },
        ],
      }),
    );
    await interact(() => {
      store.dispatch({
        kind: AppEventKind.DiagnosisUpdated,
        update: { kind: DiagnosisUpdateKind.Completed, report: withUnrecognized },
      });
    });
    const unrecognizedRow = "Movies";
    await setup.waitForFrame((frame) => frame.includes(unrecognizedRow));

    await interact(() => {
      setup.mockInput.pressTab();
    });
    const safeOnly = await setup.waitForFrame((frame) => !frame.includes(unrecognizedRow));
    expect(safeOnly).toContain(ruleCopy[RuleId.HomebrewCache].title);

    await interact(() => {
      setup.mockInput.pressTab();
    });
    await setup.waitForFrame((frame) => frame.includes(unrecognizedRow));
    await interact(() => {
      setup.mockInput.pressTab();
    });
    await frameContaining(ruleCopy[RuleId.HomebrewCache].title);
  });

  test("explains a known folder in the same labelled sections as a recognized item", async () => {
    const downloadsOnly = reportFor(
      buildTree(SAMPLE_HOME.toString(), {
        children: [{ name: "Downloads", ownFilesSize: ByteSize.fromGigabytes(2) }],
      }),
    );
    await interact(() => {
      store.dispatch({
        kind: AppEventKind.DiagnosisUpdated,
        update: { kind: DiagnosisUpdateKind.Completed, report: downloadsOnly },
      });
    });
    const frame = await frameContaining(UiCopy.detail.ifRemoved);
    const detailPane = frame.split("\n").map((row) => row.split(PANE_DIVIDER)[1]?.trim() ?? "");
    const labelRow = detailPane.indexOf(UiCopy.detail.ifRemoved);
    expect(detailPane[labelRow - 1]).toBe("");
    expect(detailPane.indexOf(UiCopy.detail.whatItIs)).toBeLessThan(labelRow);
  });

  test("opens a finding with a mouse click", async () => {
    await showReport();
    const frame = await frameContaining(ruleCopy[RuleId.HomebrewCache].title);
    const row = frame
      .split("\n")
      .findIndex((line) => line.includes(ruleCopy[RuleId.HomebrewCache].title));
    await interact(() => setup.mockMouse.click(TERMINAL.width / 2, row));
    await frameContaining(UiCopy.detail.cleaningUp);
  });

  test("shows that cleanup unlocks after the scan, then offers the review key", async () => {
    await interact(() => {
      store.dispatch({
        kind: AppEventKind.DiagnosisUpdated,
        update: { kind: DiagnosisUpdateKind.PreliminaryFindings, findings: report.findings },
      });
    });
    await frameContaining(UiCopy.cartBar.unlocksAfterScan);
    await interact(() => {
      setup.mockInput.pressKey(" ");
    });
    const scanning = await frameContaining("1 picked");
    expect(scanning).not.toContain(UiCopy.cartBar.review);
    expect(scanning).toContain(UiCopy.cartBar.unlocksAfterScan);
    await showReport();
    await frameContaining(UiCopy.cartBar.review);
  });
});
