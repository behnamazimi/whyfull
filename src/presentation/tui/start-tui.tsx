import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import {
  DiagnosisUpdateKind,
  type Clipboard,
  type Clock,
  type DiagnoseDisk,
  type VolumeInfoProvider,
} from "../../application/index.ts";
import { App } from "./components/app.tsx";
import { AppEventKind, type AppEvent } from "./state/app-event.ts";
import { initialAppState, type AppContext } from "./state/app-state.ts";
import { AppStore } from "./state/app-store.ts";

export interface TuiDependencies {
  readonly context: AppContext;
  readonly diagnoseDisk: DiagnoseDisk;
  readonly volumes: VolumeInfoProvider;
  readonly clipboard: Clipboard;
  readonly clock: Clock;
}

export async function startTui(dependencies: TuiDependencies): Promise<void> {
  const { context, diagnoseDisk, volumes, clipboard, clock } = dependencies;
  const renderer = await createCliRenderer({ exitOnCtrlC: true, useMouse: true });
  const scanCancellation = new AbortController();
  const closed = Promise.withResolvers<undefined>();

  const store = new AppStore(initialAppState(context), {
    async copyToClipboard(text): Promise<AppEvent> {
      const copied = await clipboard.copy(text);
      return copied.ok
        ? { kind: AppEventKind.ClipboardCopied }
        : { kind: AppEventKind.ClipboardFailed, reason: copied.error.reason };
    },
    quit() {
      scanCancellation.abort();
      renderer.destroy();
      closed.resolve(undefined);
    },
  });

  createRoot(renderer).render(<App store={store} clock={clock} />);

  void volumes.usageOf(context.scanRoot).then((usage) => {
    if (usage.ok) store.dispatch({ kind: AppEventKind.VolumeMeasured, usage: usage.value });
  });

  void (async () => {
    try {
      for await (const update of diagnoseDisk.run(context.scanRoot, scanCancellation.signal)) {
        store.dispatch({ kind: AppEventKind.DiagnosisUpdated, update });
      }
    } catch (error) {
      store.dispatch({
        kind: AppEventKind.DiagnosisUpdated,
        update: { kind: DiagnosisUpdateKind.Failed, reason: String(error) },
      });
    }
  })();

  await closed.promise;
}
