import { testRender } from "@opentui/react/test-utils";
import { homedir } from "node:os";
import { act } from "react";
import { DiagnosisStage, DiagnosisUpdateKind } from "../src/application/index.ts";
import {
  AbsolutePath,
  ByteSize,
  defaultCleanupPolicy,
  defaultDiagnosisPolicy,
  defaultHistoryPolicy,
  defaultScanPolicy,
  folderScope,
} from "../src/domain/index.ts";
import { systemClock } from "../src/infrastructure/index.ts";
import { App } from "../src/presentation/tui/components/app.tsx";
import { AppEventKind, type AppEvent } from "../src/presentation/tui/state/app-event.ts";
import { initialAppState } from "../src/presentation/tui/state/app-state.ts";
import { AppStore } from "../src/presentation/tui/state/app-store.ts";
import { bunCommandRunner } from "../src/infrastructure/index.ts";
import { createMacOsPlatform } from "../src/platform/index.ts";
import { statfsVolumeInfo } from "../src/platform/posix/statfs-volume-info.ts";

const PREVIEW_SIZE = { width: 110, height: 20 };
const SAMPLE_FOLDERS = 11_555;
const SAMPLE_GIGABYTES = 96;

const home = AbsolutePath.parse(homedir());
if (!home.ok) throw new Error("Home folder is not absolute");
const platform = createMacOsPlatform({
  home: home.value,
  clock: systemClock,
  commands: bunCommandRunner,
});
const noEvents = (): AsyncIterable<AppEvent> => ({
  [Symbol.asyncIterator]: () => ({ next: () => Promise.resolve({ done: true, value: undefined }) }),
});
const store = new AppStore(
  initialAppState({
    home: home.value,
    initialScope: folderScope(home.value),
    wholeDiskScope: undefined,
    systemDescription: "macOS",
    scanPolicy: defaultScanPolicy,
    diagnosisPolicy: defaultDiagnosisPolicy,
    historyPolicy: defaultHistoryPolicy,
    cleanupPolicy: defaultCleanupPolicy,
    highRiskLimits: platform.highRiskLimits,
    protectedLocations: platform.protectedLocations,
    knownFolders: platform.knownFolders,
  }),
  {
    copyToClipboard: () => Promise.resolve({ kind: AppEventKind.ClipboardCopied }),
    openPermissionSettings: () => Promise.resolve({ kind: AppEventKind.SettingsOpened }),
    startScan: () => undefined,
    planCleanup: () => new Promise<never>(() => undefined),
    runCleanup: noEvents,
    recordHistory: () => ({ kind: AppEventKind.HistoryCompared, diff: undefined }),
    recordHighRiskMode: () => undefined,
    quit: () => undefined,
  },
);
const setup = await testRender(<App store={store} clock={systemClock} />, PREVIEW_SIZE);
const usage = await statfsVolumeInfo.usageOf(home.value);
await act(async () => {
  if (usage.ok) store.dispatch({ kind: AppEventKind.VolumeMeasured, usage: usage.value });
  store.dispatch({
    kind: AppEventKind.DiagnosisUpdated,
    update: {
      kind: DiagnosisUpdateKind.Progress,
      stage: DiagnosisStage.FullScan,
      progress: {
        directoriesScanned: SAMPLE_FOLDERS,
        sizeFound: ByteSize.fromGigabytes(SAMPLE_GIGABYTES),
        currentPath: home.value,
      },
    },
  });
  await setup.renderOnce();
});
await setup.renderOnce();
console.log(setup.captureCharFrame());
await setup.dispose();
