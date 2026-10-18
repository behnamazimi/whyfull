import { CliRenderEvents, createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import {
  CleanupEventKind,
  type CleanupJournal,
  type Clipboard,
  type Clock,
  type DiagnoseDisk,
  type ExecuteCleanup,
  type AppActivity,
  type PathOpener,
  type PermissionAdvisor,
  type PlanCleanup,
  type RecordScanHistory,
  type StorageInspector,
  type VolumeInfoProvider,
} from "../../application/index.ts";
import type { ScanScope } from "../../domain/index.ts";
import { UiCopy } from "../copy/ui-copy.ts";
import { App } from "./components/app.tsx";
import { ScanSession } from "./scan-session.ts";
import { AppEventKind, type AppEvent } from "./state/app-event.ts";
import { CleanupPhase, initialAppState, type AppContext } from "./state/app-state.ts";
import { AppStore } from "./state/app-store.ts";

const RUNNING_APPS_REFRESH_MILLISECONDS = 5000;

// A closed terminal (SIGHUP) or a polite kill (SIGTERM) waits for a running cleanup to finish, so
// every action's result reaches the journal. OpenTUI tears the screen down on the other signals.
const SIGNALS_THAT_WAIT_FOR_CLEANUP: readonly NodeJS.Signals[] = ["SIGHUP", "SIGTERM"];
const SIGNALS_THAT_STOP_AT_ONCE: NodeJS.Signals[] = [
  "SIGINT",
  "SIGQUIT",
  "SIGABRT",
  "SIGPIPE",
  "SIGBUS",
];

export interface TuiDependencies {
  readonly context: AppContext;
  readonly diagnoseDisk: DiagnoseDisk;
  readonly volumes: VolumeInfoProvider;
  readonly storage: StorageInspector;
  readonly permissions: PermissionAdvisor;
  readonly planCleanup: PlanCleanup;
  readonly executeCleanup: ExecuteCleanup;
  readonly cleanupJournal: CleanupJournal;
  readonly scanHistory: RecordScanHistory;
  readonly clipboard: Clipboard;
  readonly opener: PathOpener;
  readonly apps: AppActivity;
  readonly clock: Clock;
  /** The saved history came from another version and was replaced. Tell the person once. */
  readonly historySetAside: boolean;
}

export async function startTui(dependencies: TuiDependencies): Promise<void> {
  const { context, diagnoseDisk, volumes, storage, permissions, clipboard, opener, clock } =
    dependencies;
  const { apps } = dependencies;
  const { planCleanup, executeCleanup, cleanupJournal, scanHistory } = dependencies;
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    useMouse: true,
    exitSignals: SIGNALS_THAT_STOP_AT_ONCE,
  });
  const closed = Promise.withResolvers<undefined>();
  let stopped = false;
  // However the screen goes away, stop the timers too, or they keep the process alive.
  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    for (const signal of SIGNALS_THAT_WAIT_FOR_CLEANUP) process.off(signal, stopWhenIdle);
    clearInterval(appsTimer);
    session.stop();
    closed.resolve(undefined);
  };
  const shutDown = (): void => {
    renderer.destroy();
    stop();
  };
  const isCleaning = (): boolean => store.getState().cleanup.phase === CleanupPhase.Running;
  function stopWhenIdle(): void {
    if (!isCleaning()) {
      shutDown();
      return;
    }
    const unsubscribe = store.subscribe(() => {
      if (isCleaning()) return;
      unsubscribe();
      shutDown();
    });
  }
  renderer.on(CliRenderEvents.DESTROY, stop);
  for (const signal of SIGNALS_THAT_WAIT_FOR_CLEANUP) process.on(signal, stopWhenIdle);

  const store: AppStore = new AppStore(
    {
      ...initialAppState(context),
      notice: dependencies.historySetAside ? UiCopy.notices.historySetAside : undefined,
    },
    {
      async copyToClipboard(text): Promise<AppEvent> {
        const copied = await clipboard.copy(text);
        return copied.ok
          ? { kind: AppEventKind.ClipboardCopied }
          : { kind: AppEventKind.ClipboardFailed, reason: copied.error.reason };
      },
      async openPermissionSettings(): Promise<AppEvent> {
        const opened = await permissions.openFullDiskAccessSettings();
        return opened.ok
          ? { kind: AppEventKind.SettingsOpened }
          : { kind: AppEventKind.SettingsFailed, reason: opened.error.reason };
      },
      async revealInFinder(path): Promise<AppEvent | undefined> {
        const revealed = await opener.reveal(path);
        return revealed.ok
          ? undefined
          : { kind: AppEventKind.RevealFailed, reason: revealed.error.reason };
      },
      startScan(scope) {
        startScanning(scope);
      },
      async refreshScan(report, removals, remeasure): Promise<AppEvent> {
        const refreshed = await diagnoseDisk.refresh(report, removals, remeasure);
        void volumes.usageOf(report.snapshot.root.path).then((usage) => {
          if (usage.ok) store.dispatch({ kind: AppEventKind.VolumeMeasured, usage: usage.value });
        });
        return { kind: AppEventKind.ScanRefreshed, report: refreshed };
      },
      recordHistory(snapshot, scope): AppEvent {
        return {
          kind: AppEventKind.HistoryCompared,
          diff: scanHistory.recordAndCompare(snapshot, scope),
        };
      },
      async planCleanup(draft, scanRoot): Promise<AppEvent> {
        return { kind: AppEventKind.CleanupPlanned, plan: await planCleanup.plan(draft, scanRoot) };
      },
      async *runCleanup(plan, volume): AsyncGenerator<AppEvent> {
        for await (const event of executeCleanup.run(plan, volume)) {
          yield event.kind === CleanupEventKind.ActionFinished
            ? { kind: AppEventKind.CleanupActionFinished, result: event.result }
            : { kind: AppEventKind.CleanupFinished, report: event.report };
        }
      },
      recordHighRiskMode(turnedOn) {
        cleanupJournal.recordHighRiskMode(turnedOn);
      },
      quit() {
        shutDown();
      },
    },
  );

  const session = new ScanSession(diagnoseDisk, (update) => {
    store.dispatch({ kind: AppEventKind.DiagnosisUpdated, update });
  });

  function startScanning(scope: ScanScope): void {
    session.start(scope);
    void volumes.usageOf(scope.root).then((usage) => {
      if (usage.ok) store.dispatch({ kind: AppEventKind.VolumeMeasured, usage: usage.value });
    });
    void storage.describe(scope.root).then((layout) => {
      if (layout.ok) store.dispatch({ kind: AppEventKind.StorageDescribed, layout: layout.value });
    });
  }

  const checkRunningApps = (): void => {
    void apps.runningAppNames().then((names) => {
      store.dispatch({ kind: AppEventKind.RunningAppsChecked, apps: names });
    });
  };
  checkRunningApps();
  const appsTimer = setInterval(checkRunningApps, RUNNING_APPS_REFRESH_MILLISECONDS);

  createRoot(renderer).render(<App store={store} clock={clock} />);
  startScanning(context.initialScope);
  void permissions.fullDiskAccess().then((access) => {
    store.dispatch({ kind: AppEventKind.FullDiskAccessChecked, access });
  });

  await closed.promise;
}
