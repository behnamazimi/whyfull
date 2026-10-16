import { describe, expect, test } from "bun:test";
import { RGBA } from "@opentui/core";
import { testRender } from "@opentui/react/test-utils";
import { act } from "react";
import { DiagnosisUpdateKind } from "../../src/application/index.ts";
import { ByteSize, RuleId } from "../../src/domain/index.ts";
import { ruleCopy } from "../../src/presentation/copy/rule-copy.ts";
import { colorSchemes, ThemeMode } from "../../src/presentation/theme.ts";
import { App } from "../../src/presentation/tui/components/app.tsx";
import { AppEventKind, type AppEvent } from "../../src/presentation/tui/state/app-event.ts";
import { initialAppState } from "../../src/presentation/tui/state/app-state.ts";
import { AppStore } from "../../src/presentation/tui/state/app-store.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { buildTree, REFERENCE_DATE } from "../support/domain-builders.ts";
import { reportFor, SAMPLE_HOME } from "../support/report-builder.ts";

const TERMINAL = { width: 100, height: 30 };
const DARK_TEXT_ON_WHITE_BACKGROUND =
  "\x1b]10;rgb:0000/0000/0000\x07\x1b]11;rgb:ffff/ffff/ffff\x07";

const report = reportFor(
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
    ],
  }),
);

const noEvents = (): AsyncIterable<AppEvent> => ({
  [Symbol.asyncIterator]: () => ({ next: () => Promise.resolve({ done: true, value: undefined }) }),
});

async function selectedRowBackground(terminalReply: string | undefined): Promise<RGBA> {
  const store = new AppStore(initialAppState(sampleAppContext), {
    copyToClipboard: () => Promise.resolve({ kind: AppEventKind.ClipboardCopied }),
    openPermissionSettings: () => Promise.resolve({ kind: AppEventKind.SettingsOpened }),
    startScan: () => undefined,
    planCleanup: () => new Promise<never>(() => undefined),
    runCleanup: noEvents,
    recordHistory: () => ({ kind: AppEventKind.HistoryCompared, diff: undefined }),
    recordHighRiskMode: () => undefined,
    quit: () => undefined,
  });
  const setup = await testRender(
    <App store={store} clock={{ now: () => REFERENCE_DATE }} />,
    TERMINAL,
  );
  await act(async () => {
    if (terminalReply !== undefined) setup.renderer.stdin.emit("data", Buffer.from(terminalReply));
    store.dispatch({
      kind: AppEventKind.DiagnosisUpdated,
      update: { kind: DiagnosisUpdateKind.Completed, report },
    });
    await setup.renderOnce();
  });
  await setup.renderOnce();
  const title = ruleCopy[RuleId.HomebrewCache].title;
  const span = setup
    .captureSpans()
    .lines.flatMap((line) => line.spans)
    .find((candidate) => candidate.text.includes(title));
  await act(() => setup.dispose());
  if (span === undefined) throw new Error("The selected row was not drawn");
  return span.bg;
}

describe("TUI colours follow the terminal theme", () => {
  test("uses the dark scheme until the terminal says otherwise", async () => {
    const background = await selectedRowBackground(undefined);
    expect(background.toInts()).toEqual(
      RGBA.fromHex(colorSchemes[ThemeMode.Dark].selectionBackground).toInts(),
    );
  });

  test("uses a light selection highlight in a light terminal", async () => {
    const background = await selectedRowBackground(DARK_TEXT_ON_WHITE_BACKGROUND);
    expect(background.toInts()).toEqual(
      RGBA.fromHex(colorSchemes[ThemeMode.Light].selectionBackground).toInts(),
    );
  });
});
