import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useSyncExternalStore, type ReactNode } from "react";
import type { Clock } from "../../../application/index.ts";
import { actionForKey, dialogKeyFor, TypingKey, typingKeyFor, UserAction } from "../../keymap.ts";
import { colorSchemes } from "../../theme.ts";
import { AppEventKind } from "../state/app-event.ts";
import type { AppStore } from "../state/app-store.ts";
import { ScreenKind } from "../state/screen.ts";
import { isTypingConfirmation } from "../state/selectors.ts";
import { appView } from "../view-models/app-view.ts";
import type { Viewport } from "../view-models/layout.ts";
import { windowTooSmallView } from "../view-models/window-too-small-view.ts";
import { ActionBar } from "./action-bar.tsx";
import { ColorSchemeContext } from "./color-scheme-context.ts";
import { DialogLayer } from "./dialogs.tsx";
import { KeyStrip } from "./key-strip.tsx";
import { BodyScreen, type BodyHandlers } from "./screens.tsx";
import { SummaryBand } from "./summary-band.tsx";
import { TabBar } from "./tab-bar.tsx";
import { useThemeMode } from "./use-theme-mode.ts";
import { WindowTooSmallScreen } from "./window-too-small-screen.tsx";

// One letter or digit, so a held arrow or function key never types into the confirmation.
const TYPED_CHARACTER = /^[\p{L}\p{N}]$/u;

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

  const typeConfirmation = (keyName: string, sequence: string): void => {
    switch (typingKeyFor(keyName)) {
      case TypingKey.Submit:
        dispatchAction(UserAction.ConfirmCleanup);
        return;
      case TypingKey.Erase:
        store.dispatch({ kind: AppEventKind.ConfirmationErased });
        return;
      case TypingKey.Cancel:
        dispatchAction(UserAction.Back);
        return;
      case undefined:
        if (TYPED_CHARACTER.test(sequence)) {
          store.dispatch({ kind: AppEventKind.ConfirmationTyped, character: sequence });
        }
        return;
    }
  };

  useKeyboard((key) => {
    if (tooSmall === undefined && state.screen.kind === ScreenKind.HighRiskDialog) {
      const dialogKey = dialogKeyFor(key.name);
      if (dialogKey !== undefined)
        store.dispatch({ kind: AppEventKind.DialogKeyPressed, key: dialogKey });
      return;
    }
    if (tooSmall === undefined && isTypingConfirmation(state)) {
      if (!key.ctrl && !key.meta) typeConfirmation(key.name, key.sequence);
      return;
    }
    // A shifted letter is a different key: Shift+S copies a summary, plain s selects all safe items.
    const action = key.shift
      ? (actionForKey(key.sequence) ?? actionForKey(key.name))
      : (actionForKey(key.name) ?? actionForKey(key.sequence));
    if (action === undefined) return;
    // The user can't see what a key would do, so only quitting works until the window grows.
    if (tooSmall !== undefined && action !== UserAction.Quit) return;
    dispatchAction(action);
  });

  const handlers: BodyHandlers = {
    onRowClick: (index) => {
      store.dispatch({ kind: AppEventKind.RowClicked, index });
    },
    onScroll: (towardsTop) => {
      dispatchAction(towardsTop ? UserAction.MoveUp : UserAction.MoveDown);
    },
    onAction: dispatchAction,
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
      <TabBar view={view.tabs} onAction={dispatchAction} />
      <SummaryBand view={view.summary} />
      <box flexDirection="column" flexGrow={1} flexShrink={1} overflow="hidden">
        <BodyScreen view={view.body} handlers={handlers} />
      </box>
      <ActionBar view={view.actionBar} onAction={dispatchAction} />
      {view.dialog === undefined ? (
        <KeyStrip view={view.keys} onAction={dispatchAction} />
      ) : (
        <DialogLayer
          dialog={view.dialog}
          viewport={viewport}
          keys={view.keys}
          onAction={dispatchAction}
        />
      )}
    </box>
  );
}
