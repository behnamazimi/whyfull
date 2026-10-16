import type {
  AccessState,
  DiagnosisReport,
  DiagnosisStage,
  ScanProgress,
} from "../../../application/index.ts";
import type {
  AbsolutePath,
  ActionResult,
  CartEntry,
  Classification,
  CleanupPlan,
  CleanupReport,
  DiagnosisPolicy,
  Finding,
  ScanPolicy,
  ScanScope,
  StorageLayout,
  VolumeUsage,
} from "../../../domain/index.ts";
import { initialScreen, type Screen } from "./screen.ts";

export const ScanStatus = {
  Running: "running",
  Completed: "completed",
  Failed: "failed",
} as const;
export type ScanStatus = (typeof ScanStatus)[keyof typeof ScanStatus];

export type ScanState =
  | {
      readonly status: typeof ScanStatus.Running;
      readonly stage: DiagnosisStage | undefined;
      readonly progress: ScanProgress | undefined;
      readonly findings: readonly Finding[];
    }
  | {
      readonly status: typeof ScanStatus.Completed;
      readonly report: DiagnosisReport;
      readonly findings: readonly Finding[];
      readonly classificationByPath: ReadonlyMap<string, Classification>;
    }
  | {
      readonly status: typeof ScanStatus.Failed;
      readonly reason: string;
      readonly findings: readonly Finding[];
    };

export interface AppContext {
  readonly home: AbsolutePath;
  readonly initialScope: ScanScope;
  readonly wholeDiskScope: ScanScope | undefined;
  readonly systemDescription: string;
  readonly scanPolicy: ScanPolicy;
  readonly diagnosisPolicy: DiagnosisPolicy;
}

export interface AppState {
  readonly context: AppContext;
  readonly volume: VolumeUsage | undefined;
  readonly storage: StorageLayout | undefined;
  readonly fullDiskAccess: AccessState | undefined;
  readonly scope: ScanScope;
  readonly scan: ScanState;
  readonly cart: ReadonlyMap<string, CartEntry>;
  readonly cleanup: CleanupState;
  readonly screen: Screen;
  readonly notice: string | undefined;
}

export const runningScan: ScanState = {
  status: ScanStatus.Running,
  stage: undefined,
  progress: undefined,
  findings: [],
};

export const initialAppState = (context: AppContext): AppState => ({
  context,
  volume: undefined,
  storage: undefined,
  fullDiskAccess: undefined,
  scope: context.initialScope,
  scan: runningScan,
  cart: new Map(),
  cleanup: idleCleanup,
  screen: initialScreen,
  notice: undefined,
});

export const CleanupPhase = {
  Idle: "idle",
  Planning: "planning",
  Reviewing: "reviewing",
  Running: "running",
  Finished: "finished",
} as const;
export type CleanupPhase = (typeof CleanupPhase)[keyof typeof CleanupPhase];

export type CleanupState =
  | { readonly phase: typeof CleanupPhase.Idle }
  | { readonly phase: typeof CleanupPhase.Planning }
  | { readonly phase: typeof CleanupPhase.Reviewing; readonly plan: CleanupPlan }
  | {
      readonly phase: typeof CleanupPhase.Running;
      readonly plan: CleanupPlan;
      readonly results: readonly ActionResult[];
    }
  | { readonly phase: typeof CleanupPhase.Finished; readonly report: CleanupReport };

export const idleCleanup: CleanupState = { phase: CleanupPhase.Idle };
