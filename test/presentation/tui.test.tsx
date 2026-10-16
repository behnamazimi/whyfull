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
      quit: () => {
        quitCount += 1;
      },
    });
    setup = await testRender(<App store={store} clock={{ now: () => REFERENCE_DATE }} />, TERMINAL);
  });

  afterEach(async () => {
    await setup.dispose();
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

  test("opens a finding with a mouse click", async () => {
    await showReport();
    const frame = await frameContaining(ruleCopy[RuleId.HomebrewCache].title);
    const row = frame
      .split("\n")
      .findIndex((line) => line.includes(ruleCopy[RuleId.HomebrewCache].title));
    await interact(() => setup.mockMouse.click(TERMINAL.width / 2, row));
    await frameContaining(UiCopy.detail.howToFreeSpace);
  });
});
