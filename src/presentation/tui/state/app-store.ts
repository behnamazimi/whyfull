import type { DiagnosisReport } from "../../../application/index.ts";
import {
  assertNever,
  type AbsolutePath,
  type CleanupDraft,
  type CleanupPlan,
  type Removal,
  type ScanScope,
  type ScanSnapshot,
} from "../../../domain/index.ts";
import { EffectKind, type AppEvent, type Effect } from "./app-event.ts";
import type { AppState } from "./app-state.ts";
import { reduce } from "./reducer.ts";

export interface EffectHandlers {
  copyToClipboard(text: string): Promise<AppEvent>;
  openPermissionSettings(): Promise<AppEvent>;
  /** Resolves to an event only when Finder could not be opened. */
  revealInFinder(path: AbsolutePath): Promise<AppEvent | undefined>;
  startScan(scope: ScanScope): void;
  planCleanup(draft: CleanupDraft, scanRoot: AbsolutePath): Promise<AppEvent>;
  runCleanup(plan: CleanupPlan, volume: AbsolutePath): AsyncIterable<AppEvent>;
  recordHistory(snapshot: ScanSnapshot, scope: ScanScope): AppEvent;
  refreshScan(
    report: DiagnosisReport,
    removals: readonly Removal[],
    remeasure: readonly AbsolutePath[],
  ): Promise<AppEvent>;
  recordHighRiskMode(turnedOn: boolean): void;
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

  private async forward(events: AsyncIterable<AppEvent>): Promise<void> {
    for await (const event of events) this.dispatch(event);
  }

  private run(effect: Effect): void {
    switch (effect.kind) {
      case EffectKind.CopyToClipboard:
        void this.effects.copyToClipboard(effect.text).then(this.dispatch);
        return;
      case EffectKind.Quit:
        this.effects.quit();
        return;
      case EffectKind.StartScan:
        this.effects.startScan(effect.scope);
        return;
      case EffectKind.OpenPermissionSettings:
        void this.effects.openPermissionSettings().then(this.dispatch);
        return;
      case EffectKind.RevealInFinder:
        void this.effects.revealInFinder(effect.path).then((event) => {
          if (event !== undefined) this.dispatch(event);
        });
        return;
      case EffectKind.PlanCleanup:
        void this.effects.planCleanup(effect.draft, effect.scanRoot).then(this.dispatch);
        return;
      case EffectKind.RecordHistory:
        this.dispatch(this.effects.recordHistory(effect.snapshot, effect.scope));
        return;
      case EffectKind.RefreshScan:
        void this.effects
          .refreshScan(effect.report, effect.removals, effect.remeasure)
          .then(this.dispatch);
        return;
      case EffectKind.RunCleanup:
        void this.forward(this.effects.runCleanup(effect.plan, effect.volume));
        return;
      case EffectKind.RecordHighRiskMode:
        this.effects.recordHighRiskMode(effect.turnedOn);
        return;
      default:
        assertNever(effect);
    }
  }
}
