import type { ScanScope } from "../../../domain/index.ts";
import { EffectKind, type Effect } from "./app-event.ts";
import { noRevision, runningScan, type AppState } from "./app-state.ts";
import { initialScreen, type Screen } from "./screen.ts";

export interface Transition {
  readonly state: AppState;
  readonly effects: readonly Effect[];
}

export const stay = (state: AppState): Transition => ({ state, effects: [] });

export const withScreen = (state: AppState, screen: Screen): Transition =>
  stay({ ...state, screen });

export const withNotice = (state: AppState, notice: string): Transition =>
  stay({ ...state, notice });

export const withEffect = (state: AppState, effect: Effect): Transition => ({
  state,
  effects: [effect],
});

export function restartScan(state: AppState, scope: ScanScope): Transition {
  return withEffect(
    {
      ...state,
      scope,
      scan: runningScan,
      screen: initialScreen,
      growth: undefined,
      pendingRevision: noRevision,
    },
    { kind: EffectKind.StartScan, scope },
  );
}
