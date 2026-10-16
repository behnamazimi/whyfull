import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { TestRendererSetup } from "@opentui/core/testing";
import { testRender } from "@opentui/react/test-utils";
import { act } from "react";
import { DiagnosisUpdateKind } from "../../src/application/index.ts";
import { ByteSize, isHighRiskAction, type CleanupPlan } from "../../src/domain/index.ts";
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
    children: [{ name: "VMs", ownFilesSize: ByteSize.fromGigabytes(5) }],
  }),
);

const finishedRun = (): AsyncIterable<AppEvent> => ({
  [Symbol.asyncIterator]: () => ({
    next: () => Promise.resolve({ done: true, value: undefined }),
  }),
});

describe("high-risk mode in the terminal", () => {
  let setup: TestRendererSetup;
  let store: AppStore;
  let ranPlans: CleanupPlan[];
  let modeChanges: boolean[];

  beforeEach(() => {
    ranPlans = [];
    modeChanges = [];
    store = new AppStore(initialAppState(sampleAppContext), {
      copyToClipboard: () => Promise.resolve({ kind: AppEventKind.ClipboardCopied }),
      openPermissionSettings: () => Promise.resolve({ kind: AppEventKind.SettingsOpened }),
      startScan: () => undefined,
      planCleanup: (draft) =>
        Promise.resolve({
          kind: AppEventKind.CleanupPlanned,
          plan: { actions: draft.actions.filter(isHighRiskAction), blocked: draft.blocked },
        }),
      runCleanup: (plan) => {
        ranPlans.push(plan);
        return finishedRun();
      },
      recordHistory: () => ({ kind: AppEventKind.HistoryCompared, diff: undefined }),
      recordHighRiskMode: (turnedOn) => {
        modeChanges.push(turnedOn);
      },
      quit: () => undefined,
    });
  });

  afterEach(async () => {
    await setup.dispose();
  });

  const render = async (size: { readonly width: number; readonly height: number }) => {
    setup = await testRender(<App store={store} clock={{ now: () => REFERENCE_DATE }} />, size);
  };

  const interact = (interaction: () => unknown): Promise<void> =>
    act(async () => {
      await interaction();
    });

  const press = (key: string): Promise<void> =>
    interact(() => {
      setup.mockInput.pressKey(key);
    });

  const frameContaining = (text: string): Promise<string> =>
    setup.waitForFrame((frame) => frame.includes(text));

  test("turns on with x then y, and deletes only after the word is typed", async () => {
    await render(TERMINAL);
    await interact(() => {
      store.dispatch({
        kind: AppEventKind.DiagnosisUpdated,
        update: { kind: DiagnosisUpdateKind.Completed, report },
      });
    });
    await frameContaining("VMs");

    await press("x");
    await frameContaining(UiCopy.highRisk.title);
    await press("y");
    await frameContaining(UiCopy.highRisk.badge);
    expect(modeChanges).toEqual([true]);

    await press("c");
    await frameContaining(UiCopy.cleanup.highRiskGroup);
    await press("d");
    const typedFrame = await frameContaining(
      UiCopy.cleanup.typeToConfirm(UiCopy.cleanup.confirmationWord).trim(),
    );
    expect(typedFrame).not.toContain(UiCopy.overview.title);
    expect(ranPlans).toEqual([]);

    for (const letter of "elete") await press(letter);
    await interact(() => {
      setup.mockInput.pressEnter();
    });
    expect(ranPlans.map((plan) => plan.actions.length)).toEqual([1]);
  });

  test("the explanation fits the smallest supported window", async () => {
    await render({ width: MinimumViewport.columns, height: MinimumViewport.rows });
    await press("x");
    const frame = await frameContaining(UiCopy.highRisk.title);
    expect(frame).toContain(UiCopy.highRisk.before.at(-1) ?? "");
    expect(frame).toContain(UiCopy.highRisk.keptHeading);
    expect(frame).toContain(UiCopy.highRisk.turnOnAction);
  });
});
