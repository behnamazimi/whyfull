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
  CleanupPolicy,
  CleanupReport,
  Removal,
  DiagnosisPolicy,
  Finding,
  FindingGroup,
  HighRiskLimits,
  HistoryPolicy,
  KnownFolder,
  ScanPolicy,
  ScanScope,
  SnapshotDiff,
  StorageLayout,
  VolumeUsage,
} from "../../../domain/index.ts";
import { initialCollapsedGroups } from "./navigation.ts";
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
      /** What the scan has measured completely so far. Cleanup can already work from it. */
      readonly preview: DiagnosisReport | undefined;
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

/** What cleanups took away while the scan was still running, to take out of its result too. */
export interface PendingRevision {
  readonly removals: readonly Removal[];
  readonly remeasure: readonly AbsolutePath[];
}

export const noRevision: PendingRevision = { removals: [], remeasure: [] };

export interface AppContext {
  readonly home: AbsolutePath;
  readonly initialScope: ScanScope;
  readonly wholeDiskScope: ScanScope | undefined;
  readonly systemDescription: string;
  readonly scanPolicy: ScanPolicy;
  readonly diagnosisPolicy: DiagnosisPolicy;
  readonly historyPolicy: HistoryPolicy;
  readonly cleanupPolicy: CleanupPolicy;
  readonly highRiskLimits: HighRiskLimits;
  readonly protectedLocations: readonly AbsolutePath[];
  readonly knownFolders: readonly KnownFolder[];
}

export interface AppState {
  readonly context: AppContext;
  readonly volume: VolumeUsage | undefined;
  readonly storage: StorageLayout | undefined;
  readonly fullDiskAccess: AccessState | undefined;
  /** Apps open right now, so an item can say its app has to be quit first. */
  readonly runningApps: ReadonlySet<string>;
  readonly scope: ScanScope;
  readonly scan: ScanState;
  readonly cart: ReadonlyMap<string, CartEntry>;
  readonly pendingRevision: PendingRevision;
  /** On only for this run, after the person turns it on. See ADR 0007. */
  readonly highRiskMode: boolean;
  readonly cleanup: CleanupState;
  readonly growth: SnapshotDiff | undefined;
  readonly screen: Screen;
  /** Groups of findings folded to their header on the main list. */
  readonly collapsedGroups: ReadonlySet<FindingGroup>;
  readonly notice: string | undefined;
}

export const runningScan: ScanState = {
  status: ScanStatus.Running,
  stage: undefined,
  progress: undefined,
  findings: [],
  preview: undefined,
};

export const initialAppState = (context: AppContext): AppState => ({
  context,
  volume: undefined,
  storage: undefined,
  fullDiskAccess: undefined,
  runningApps: new Set(),
  scope: context.initialScope,
  scan: runningScan,
  cart: new Map(),
  pendingRevision: noRevision,
  highRiskMode: false,
  cleanup: idleCleanup,
  growth: undefined,
  screen: initialScreen,
  collapsedGroups: initialCollapsedGroups,
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
  | {
      readonly phase: typeof CleanupPhase.Reviewing;
      readonly plan: CleanupPlan;
      /** What the person has typed to confirm deleting high-risk items. */
      readonly typed: string;
    }
  | {
      readonly phase: typeof CleanupPhase.Running;
      readonly plan: CleanupPlan;
      readonly results: readonly ActionResult[];
    }
  | { readonly phase: typeof CleanupPhase.Finished; readonly report: CleanupReport };

export const idleCleanup: CleanupState = { phase: CleanupPhase.Idle };
