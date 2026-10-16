import { assertNever } from "../../../domain/index.ts";
import { EffectKind, type AppEvent, type Effect } from "./app-event.ts";
import type { AppState } from "./app-state.ts";
import { reduce } from "./reducer.ts";

export interface EffectHandlers {
  copyToClipboard(text: string): Promise<AppEvent>;
  quit(): void;
}

type Listener = () => void;

export class AppStore {
  private state: AppState;
  private readonly listeners = new Set<Listener>();

  constructor(
    initialState: AppState,
    private readonly effects: EffectHandlers,
  ) {
    this.state = initialState;
  }

  readonly getState = (): AppState => this.state;

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly dispatch = (event: AppEvent): void => {
    const transition = reduce(this.state, event);
    this.state = transition.state;
    for (const listener of this.listeners) listener();
    for (const effect of transition.effects) this.run(effect);
  };

  private run(effect: Effect): void {
    switch (effect.kind) {
      case EffectKind.CopyToClipboard:
        void this.effects.copyToClipboard(effect.text).then(this.dispatch);
        return;
      case EffectKind.Quit:
        this.effects.quit();
        return;
      default:
        assertNever(effect);
    }
  }
}
