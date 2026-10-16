export type { Clock } from "./ports/clock.ts";
export {
  ScanEventKind,
  type DiskScanner,
  type ScanEvent,
  type ScanProgress,
  type ScanRequest,
} from "./ports/disk-scanner.ts";
export type { VolumeInfoProvider, VolumeUnavailable } from "./ports/volume-info-provider.ts";
export { buildRuleIndex } from "./use-cases/build-rule-index.ts";
export {
  DiagnoseDisk,
  DiagnosisUpdateKind,
  type DiagnoseDiskDependencies,
  type DiagnosisReport,
  type DiagnosisUpdate,
} from "./use-cases/diagnose-disk.ts";
