import { testRender } from "@opentui/react/test-utils";
import { homedir } from "node:os";
import { act } from "react";
import { buildRuleIndex, DiagnoseDisk, PlanCleanup } from "../src/application/index.ts";
import {
  AbsolutePath,
  defaultCleanupPolicy,
  defaultDiagnosisPolicy,
  defaultHistoryPolicy,
  defaultScanPolicy,
  folderScope,
} from "../src/domain/index.ts";
import { bunCommandRunner, systemClock } from "../src/infrastructure/index.ts";
import { createMacOsPlatform } from "../src/platform/index.ts";
import { App } from "../src/presentation/tui/components/app.tsx";
import { AppEventKind, type AppEvent } from "../src/presentation/tui/state/app-event.ts";
import { initialAppState } from "../src/presentation/tui/state/app-state.ts";
import { AppStore } from "../src/presentation/tui/state/app-store.ts";

const noCleanupEvents = (): AsyncIterable<AppEvent> => ({
  [Symbol.asyncIterator]: () => ({
    next: () => Promise.resolve({ done: true, value: undefined }),
  }),
});

const PREVIEW_SIZE = { width: 110, height: 42 };
const PLANNING_WAIT_MILLISECONDS = 1500;
const [, , folderArgument, ...keys] = process.argv;
const folder = AbsolutePath.parse(folderArgument ?? homedir());
const home = AbsolutePath.parse(homedir());
if (!folder.ok || !home.ok) throw new Error("Pass an absolute folder");

const platform = createMacOsPlatform({
  home: home.value,
  clock: systemClock,
  commands: bunCommandRunner,
});
const index = buildRuleIndex(platform.rulePacks, platform.pathContext);
if (!index.ok) throw new Error("Rules are invalid");
const diagnoseDisk = new DiagnoseDisk({
  scanner: platform.scanner,
  ruleIndex: index.value,
  personalFileExtensions: platform.personalFileExtensions,
  scanPolicy: defaultScanPolicy,
  diagnosisPolicy: defaultDiagnosisPolicy,
  clock: systemClock,
});
const store = new AppStore(
  initialAppState({
    home: home.value,
    initialScope: folderScope(folder.value),
    wholeDiskScope: platform.wholeDiskScope,
    systemDescription: await platform.systemInfo.describeSystem(),
    scanPolicy: defaultScanPolicy,
    diagnosisPolicy: defaultDiagnosisPolicy,
    historyPolicy: defaultHistoryPolicy,
    cleanupPolicy: defaultCleanupPolicy,
    highRiskLimits: platform.highRiskLimits,
    protectedLocations: platform.protectedLocations,
  }),
  {
    copyToClipboard: () => Promise.resolve({ kind: AppEventKind.ClipboardCopied }),
    openPermissionSettings: () => Promise.resolve({ kind: AppEventKind.SettingsOpened }),
    startScan: () => undefined,
    planCleanup: async (draft, scanRoot) => ({
      kind: AppEventKind.CleanupPlanned,
      plan: await new PlanCleanup({
        files: platform.files,
        apps: platform.apps,
        ownerTools: platform.ownerTools,
        protectedLocations: platform.protectedLocations,
      }).plan(draft, scanRoot),
    }),
    runCleanup: noCleanupEvents,
    recordHistory: () => ({ kind: AppEventKind.HistoryCompared, diff: undefined }),
    recordHighRiskMode: () => undefined,
    quit: () => undefined,
  },
);
const setup = await testRender(<App store={store} clock={systemClock} />, PREVIEW_SIZE);
const layout = await platform.storage.describe(folder.value);
const usage = await platform.volumes.usageOf(folder.value);
const access = await platform.permissions.fullDiskAccess();
await act(async () => {
  if (layout.ok) store.dispatch({ kind: AppEventKind.StorageDescribed, layout: layout.value });
  if (usage.ok) store.dispatch({ kind: AppEventKind.VolumeMeasured, usage: usage.value });
  store.dispatch({ kind: AppEventKind.FullDiskAccessChecked, access });
  for await (const update of diagnoseDisk.run(folderScope(folder.value))) {
    store.dispatch({ kind: AppEventKind.DiagnosisUpdated, update });
  }
  for (const key of keys) setup.mockInput.pressKey(key);
  await setup.renderOnce();
});
await act(async () => {
  await Bun.sleep(PLANNING_WAIT_MILLISECONDS);
});
await setup.renderOnce();
console.log(setup.captureCharFrame());
await setup.dispose();
