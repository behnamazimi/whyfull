import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { TestRendererSetup } from "@opentui/core/testing";
import { testRender } from "@opentui/react/test-utils";
import { act } from "react";
import { DiagnosisUpdateKind } from "../../src/application/index.ts";
import {
  ByteSize,
  ChangeDirection,
  RuleId,
  UsageShareKind,
  VolumeRole,
} from "../../src/domain/index.ts";
import { ruleCopy } from "../../src/presentation/copy/rule-copy.ts";
import { UiCopy } from "../../src/presentation/copy/ui-copy.ts";
import { App } from "../../src/presentation/tui/components/app.tsx";
import { AppEventKind, type AppEvent } from "../../src/presentation/tui/state/app-event.ts";
import { initialAppState } from "../../src/presentation/tui/state/app-state.ts";
import { AppStore } from "../../src/presentation/tui/state/app-store.ts";
import { MinimumViewport } from "../../src/presentation/tui/view-models/layout.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { buildTree, REFERENCE_DATE } from "../support/domain-builders.ts";
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

const noEvents = (): AsyncIterable<AppEvent> => ({
  [Symbol.asyncIterator]: () => ({ next: () => Promise.resolve({ done: true, value: undefined }) }),
});

const manyFindingsReport = reportFor(
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
      ...["Movies", "Music", "Projects", "Games", "Archive", "Photos", "Videos", "Backups"].map(
        (name, index) => ({
          name,
          ownFilesSize: ByteSize.fromGigabytes(index + 2),
        }),
      ),
    ],
  }),
);

describe("TUI in a window that is too small", () => {
  const tinyTerminal = { width: 60, height: 12 };
  let quitCount: number;
  let store: AppStore;
  let setup: TestRendererSetup;

  beforeEach(async () => {
    quitCount = 0;
    store = new AppStore(initialAppState(sampleAppContext), {
      copyToClipboard: () => Promise.resolve({ kind: AppEventKind.ClipboardCopied }),
      openPermissionSettings: () => Promise.resolve({ kind: AppEventKind.SettingsOpened }),
      startScan: () => undefined,
      planCleanup: () => new Promise<never>(() => undefined),
      runCleanup: noEvents,
      recordHistory: () => ({ kind: AppEventKind.HistoryCompared, diff: undefined }),
      quit: () => {
        quitCount += 1;
      },
    });
    setup = await testRender(
      <App store={store} clock={{ now: () => REFERENCE_DATE }} />,
      tinyTerminal,
    );
    await act(async () => {
      store.dispatch({
        kind: AppEventKind.DiagnosisUpdated,
        update: { kind: DiagnosisUpdateKind.Completed, report },
      });
      await setup.renderOnce();
    });
  });

  afterEach(async () => {
    await setup.dispose();
  });

  const frame = async (): Promise<string> => {
    await setup.renderOnce();
    return setup.captureCharFrame();
  };

  test("asks for a bigger window instead of drawing a broken layout", async () => {
    const text = await frame();
    expect(text).toContain(UiCopy.windowTooSmall.title);
    expect(text).not.toContain(UiCopy.diagnosis.title);
  });

  test("ignores keys other than quit while the window is too small", async () => {
    await act(async () => {
      setup.mockInput.pressKey("?");
      await setup.renderOnce();
    });
    expect(store.getState().screen.kind).toBe(initialAppState(sampleAppContext).screen.kind);
    await act(async () => {
      setup.mockInput.pressKey("q");
      await setup.renderOnce();
    });
    expect(quitCount).toBe(1);
  });

  test("carries on once the window is big enough", async () => {
    await act(async () => {
      setup.resize(MinimumViewport.columns, MinimumViewport.rows);
      await setup.renderOnce();
    });
    const text = await frame();
    expect(text).not.toContain(UiCopy.windowTooSmall.title);
    expect(text).toContain(UiCopy.diagnosis.title);
  });
});

const storageLayout = {
  capacity: ByteSize.fromGigabytes(494),
  free: ByteSize.fromGigabytes(16),
  localSnapshotCount: 2,
  volumes: [
    { name: "Macintosh HD", role: VolumeRole.System, used: ByteSize.fromGigabytes(12) },
    { name: "Data", role: VolumeRole.Data, used: ByteSize.fromGigabytes(436) },
    { name: "VM", role: VolumeRole.VirtualMemory, used: ByteSize.fromGigabytes(17) },
    { name: "Nix Store", role: VolumeRole.Other, used: ByteSize.fromGigabytes(3) },
  ],
};

describe("disk overview layout", () => {
  const overviewFrame = async (terminal: {
    readonly width: number;
    readonly height: number;
  }): Promise<string[]> => {
    const store = new AppStore(initialAppState(sampleAppContext), {
      copyToClipboard: () => Promise.resolve({ kind: AppEventKind.ClipboardCopied }),
      openPermissionSettings: () => Promise.resolve({ kind: AppEventKind.SettingsOpened }),
      startScan: () => undefined,
      planCleanup: () => new Promise<never>(() => undefined),
      runCleanup: noEvents,
      recordHistory: () => ({ kind: AppEventKind.HistoryCompared, diff: undefined }),
      quit: () => undefined,
    });
    const setup = await testRender(
      <App store={store} clock={{ now: () => REFERENCE_DATE }} />,
      terminal,
    );
    await act(async () => {
      store.dispatch({ kind: AppEventKind.StorageDescribed, layout: storageLayout });
      setup.mockInput.pressKey("d");
      await setup.renderOnce();
    });
    await setup.renderOnce();
    const lines = setup.captureCharFrame().split("\n");
    await setup.dispose();
    return lines;
  };

  const overview = UiCopy.overview;
  const operatingSystem = overview.shares[UsageShareKind.OperatingSystem]();
  const titles = [operatingSystem.title, overview.free.title];

  test("keeps every row readable when the rows don't all fit with spacing", async () => {
    const lines = await overviewFrame({ width: 100, height: 24 });
    for (const title of titles) {
      expect(lines.some((line) => line.includes(title))).toBe(true);
    }
    expect(lines.some((line) => line.trim() === operatingSystem.detail)).toBe(true);
  });

  test("fits every row on one line in the smallest supported window", async () => {
    const lines = await overviewFrame({
      width: MinimumViewport.columns,
      height: MinimumViewport.rows,
    });
    for (const title of titles) {
      expect(lines.some((line) => line.includes(title))).toBe(true);
    }
  });
});

describe("TUI layout in a short terminal", () => {
  test("never squeezes two-line rows or the header onto one line", async () => {
    const shortTerminal = { width: 120, height: 18 };
    const store = new AppStore(initialAppState(sampleAppContext), {
      copyToClipboard: () => Promise.resolve({ kind: AppEventKind.ClipboardCopied }),
      openPermissionSettings: () => Promise.resolve({ kind: AppEventKind.SettingsOpened }),
      startScan: () => undefined,
      planCleanup: () => new Promise<never>(() => undefined),
      runCleanup: noEvents,
      recordHistory: () => ({ kind: AppEventKind.HistoryCompared, diff: undefined }),
      quit: () => undefined,
    });
    const setup = await testRender(
      <App store={store} clock={{ now: () => REFERENCE_DATE }} />,
      shortTerminal,
    );
    await act(async () => {
      store.dispatch({
        kind: AppEventKind.VolumeMeasured,
        usage: {
          capacity: ByteSize.fromGigabytes(500),
          used: ByteSize.fromGigabytes(480),
          available: ByteSize.fromGigabytes(20),
        },
      });
      store.dispatch({
        kind: AppEventKind.DiagnosisUpdated,
        update: { kind: DiagnosisUpdateKind.Completed, report: manyFindingsReport },
      });
      store.dispatch({
        kind: AppEventKind.HistoryCompared,
        diff: {
          previousTakenAt: REFERENCE_DATE,
          total: { direction: ChangeDirection.Shrank, amount: ByteSize.fromMegabytes(3) },
          grownFolders: [],
        },
      });
      await setup.renderOnce();
    });
    await setup.renderOnce();
    const lines = setup.captureCharFrame().split("\n");
    const diskLine = lines.find((line) => line.includes("% full")) ?? "";
    expect(diskLine).not.toContain(UiCopy.header.scanLabel);
    const unexplainedLines = lines.filter((line) => line.includes("Not recognized"));
    expect(unexplainedLines.every((line) => line.trim().startsWith("Not recognized"))).toBe(true);
    await setup.dispose();
  });
});

describe("TUI layout stays intact while content changes", () => {
  let setup: TestRendererSetup;
  let store: AppStore;

  beforeEach(async () => {
    store = new AppStore(initialAppState(sampleAppContext), {
      copyToClipboard: () => Promise.resolve({ kind: AppEventKind.ClipboardCopied }),
      openPermissionSettings: () => Promise.resolve({ kind: AppEventKind.SettingsOpened }),
      startScan: () => undefined,
      planCleanup: () => new Promise<never>(() => undefined),
      runCleanup: noEvents,
      recordHistory: () => ({ kind: AppEventKind.HistoryCompared, diff: undefined }),
      quit: () => undefined,
    });
    setup = await testRender(<App store={store} clock={{ now: () => REFERENCE_DATE }} />, TERMINAL);
  });

  afterEach(async () => {
    await setup.dispose();
  });

  const settledFrame = async (interaction: () => void): Promise<string[]> => {
    await act(async () => {
      interaction();
      await setup.renderOnce();
    });
    await setup.renderOnce();
    return setup.captureCharFrame().split("\n");
  };

  const lineWith = (lines: readonly string[], text: string): string =>
    lines.find((line) => line.includes(text)) ?? "";

  test("the disk row keeps its own line after the disk is measured", async () => {
    await settledFrame(() => {
      store.dispatch({
        kind: AppEventKind.DiagnosisUpdated,
        update: { kind: DiagnosisUpdateKind.Completed, report },
      });
    });
    const lines = await settledFrame(() => {
      store.dispatch({
        kind: AppEventKind.VolumeMeasured,
        usage: {
          capacity: ByteSize.fromGigabytes(500),
          used: ByteSize.fromGigabytes(480),
          available: ByteSize.fromGigabytes(20),
        },
      });
    });
    expect(lineWith(lines, "% full")).toContain(UiCopy.header.diskLabel);
    expect(lineWith(lines, "% full")).not.toContain(UiCopy.header.scanLabel);
  });

  test("rows stay on their own lines when a subtitle appears above them", async () => {
    await settledFrame(() => {
      store.dispatch({
        kind: AppEventKind.DiagnosisUpdated,
        update: { kind: DiagnosisUpdateKind.Completed, report },
      });
    });
    const lines = await settledFrame(() => {
      store.dispatch({
        kind: AppEventKind.HistoryCompared,
        diff: {
          previousTakenAt: REFERENCE_DATE,
          total: { direction: ChangeDirection.Shrank, amount: ByteSize.fromMegabytes(3) },
          grownFolders: [],
        },
      });
    });
    const title = ruleCopy[RuleId.HomebrewCache].title;
    expect(lineWith(lines, title)).not.toContain("Developer files");
    expect(lineWith(lines, "Since your last scan")).not.toContain("Homebrew");
  });

  test("list rows stay readable after visiting a finding and coming back", async () => {
    await settledFrame(() => {
      store.dispatch({
        kind: AppEventKind.DiagnosisUpdated,
        update: { kind: DiagnosisUpdateKind.Completed, report },
      });
    });
    await settledFrame(() => {
      setup.mockInput.pressEnter();
    });
    const lines = await settledFrame(() => {
      setup.mockInput.pressKey("h");
    });
    const title = ruleCopy[RuleId.HomebrewCache].title;
    expect(lineWith(lines, title)).not.toContain("Developer files");
    expect(lines.some((line) => line.trim().startsWith("Developer files"))).toBe(true);
  });
});
