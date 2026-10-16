import type { DiagnosisReport, DiagnosisStage, ScanProgress } from "../../../application/index.ts";
import type {
  AbsolutePath,
  Classification,
  DiagnosisPolicy,
  Finding,
  ScanPolicy,
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
  readonly scanRoot: AbsolutePath;
  readonly systemDescription: string;
  readonly scanPolicy: ScanPolicy;
  readonly diagnosisPolicy: DiagnosisPolicy;
}

export interface AppState {
  readonly context: AppContext;
  readonly volume: VolumeUsage | undefined;
  readonly scan: ScanState;
  readonly screen: Screen;
  readonly notice: string | undefined;
}

export const initialAppState = (context: AppContext): AppState => ({
  context,
  volume: undefined,
  scan: { status: ScanStatus.Running, stage: undefined, progress: undefined, findings: [] },
  screen: initialScreen,
  notice: undefined,
});
