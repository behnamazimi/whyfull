import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useSyncExternalStore, type ReactNode } from "react";
import type { Clock } from "../../../application/index.ts";
import { actionForKey, UserAction } from "../../keymap.ts";
import { AppEventKind } from "../state/app-event.ts";
import type { AppStore } from "../state/app-store.ts";
import { appView } from "../view-models/app-view.ts";
import { Footer } from "./footer.tsx";
import { Header } from "./header.tsx";
import type { ListHandlers } from "./list-rows.tsx";
import { ScreenBody } from "./screens.tsx";

export interface AppProps {
  readonly store: AppStore;
  readonly clock: Clock;
}

export function App({ store, clock }: AppProps): ReactNode {
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const { width, height } = useTerminalDimensions();
  const dispatchAction = (action: UserAction): void => {
    store.dispatch({ kind: AppEventKind.ActionRequested, action });
  };

  useKeyboard((key) => {
    const action = actionForKey(key.name) ?? actionForKey(key.sequence);
    if (action !== undefined) dispatchAction(action);
  });

  const handlers: ListHandlers = {
    onRowClick: (index) => {
      store.dispatch({ kind: AppEventKind.RowClicked, index });
    },
    onScroll: (towardsTop) => {
      dispatchAction(towardsTop ? UserAction.MoveUp : UserAction.MoveDown);
    },
  };

  const view = appView(state, { columns: width, rows: height }, clock.now());
  return (
    <box flexDirection="column" width={width} height={height}>
      <box flexShrink={0}>
        <Header view={view.header} />
      </box>
      <box flexDirection="column" flexGrow={1} flexShrink={1} overflow="hidden">
        <ScreenBody view={view.screen} handlers={handlers} />
      </box>
      <box flexShrink={0}>
        <Footer view={view.footer} />
      </box>
    </box>
  );
}
