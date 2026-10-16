import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useSyncExternalStore, type ReactNode } from "react";
import type { Clock } from "../../../application/index.ts";
import { actionForKey, UserAction } from "../../keymap.ts";
import { colorSchemes } from "../../theme.ts";
import { AppEventKind } from "../state/app-event.ts";
import type { AppStore } from "../state/app-store.ts";
import { appView } from "../view-models/app-view.ts";
import type { Viewport } from "../view-models/layout.ts";
import { windowTooSmallView } from "../view-models/window-too-small-view.ts";
import { ColorSchemeContext } from "./color-scheme-context.ts";
import { Footer } from "./footer.tsx";
import { Header } from "./header.tsx";
import type { ListHandlers } from "./list-rows.tsx";
import { ScreenBody } from "./screens.tsx";
import { useThemeMode } from "./use-theme-mode.ts";
import { WindowTooSmallScreen } from "./window-too-small-screen.tsx";

export interface AppProps {
  readonly store: AppStore;
  readonly clock: Clock;
}

export function App({ store, clock }: AppProps): ReactNode {
  const colors = colorSchemes[useThemeMode()];
  return (
    <ColorSchemeContext value={colors}>
      <AppLayout store={store} clock={clock} />
    </ColorSchemeContext>
  );
}

function AppLayout({ store, clock }: AppProps): ReactNode {
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const { width, height } = useTerminalDimensions();
  const viewport: Viewport = { columns: width, rows: height };
  const tooSmall = windowTooSmallView(state, viewport);
  const dispatchAction = (action: UserAction): void => {
    store.dispatch({ kind: AppEventKind.ActionRequested, action });
  };

  useKeyboard((key) => {
    const action = actionForKey(key.name) ?? actionForKey(key.sequence);
    if (action === undefined) return;
    // The user can't see what a key would do, so only quitting works until the window grows.
    if (tooSmall !== undefined && action !== UserAction.Quit) return;
    dispatchAction(action);
  });

  const handlers: ListHandlers = {
    onRowClick: (index) => {
      store.dispatch({ kind: AppEventKind.RowClicked, index });
    },
    onScroll: (towardsTop) => {
      dispatchAction(towardsTop ? UserAction.MoveUp : UserAction.MoveDown);
    },
  };

  if (tooSmall !== undefined) {
    return (
      <box flexDirection="column" width={width} height={height}>
        <WindowTooSmallScreen view={tooSmall} />
      </box>
    );
  }

  const view = appView(state, viewport, clock.now());
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
