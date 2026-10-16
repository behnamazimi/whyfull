import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import type {
  Clipboard,
  Clock,
  DiagnoseDisk,
  PermissionAdvisor,
  StorageInspector,
  VolumeInfoProvider,
} from "../../application/index.ts";
import type { ScanScope } from "../../domain/index.ts";
import { App } from "./components/app.tsx";
import { ScanSession } from "./scan-session.ts";
import { AppEventKind, type AppEvent } from "./state/app-event.ts";
import { initialAppState, type AppContext } from "./state/app-state.ts";
import { AppStore } from "./state/app-store.ts";

export interface TuiDependencies {
  readonly context: AppContext;
  readonly diagnoseDisk: DiagnoseDisk;
  readonly volumes: VolumeInfoProvider;
  readonly storage: StorageInspector;
  readonly permissions: PermissionAdvisor;
  readonly clipboard: Clipboard;
  readonly clock: Clock;
}

export async function startTui(dependencies: TuiDependencies): Promise<void> {
  const { context, diagnoseDisk, volumes, storage, permissions, clipboard, clock } = dependencies;
  const renderer = await createCliRenderer({ exitOnCtrlC: true, useMouse: true });
  const closed = Promise.withResolvers<undefined>();

  const store: AppStore = new AppStore(initialAppState(context), {
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
    startScan(scope) {
      startScanning(scope);
    },
    quit() {
      session.stop();
      renderer.destroy();
      closed.resolve(undefined);
    },
  });

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

  createRoot(renderer).render(<App store={store} clock={clock} />);
  startScanning(context.initialScope);
  void permissions.fullDiskAccess().then((access) => {
    store.dispatch({ kind: AppEventKind.FullDiskAccessChecked, access });
  });

  await closed.promise;
}
