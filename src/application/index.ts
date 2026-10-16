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
  DiagnosisStage,
  DiagnosisUpdateKind,
  type DiagnoseDiskDependencies,
  type DiagnosisReport,
  type DiagnosisUpdate,
} from "./use-cases/diagnose-disk.ts";
export type { Clipboard, ClipboardUnavailable } from "./ports/clipboard.ts";
export {
  CommandFailureKind,
  type CommandFailure,
  type CommandLine,
  type CommandOutput,
  type CommandRunner,
} from "./ports/command-runner.ts";
export type { SystemInfo } from "./ports/system-info.ts";
export {
  AccessState,
  type PermissionAdvisor,
  type SettingsUnavailable,
} from "./ports/permission-advisor.ts";
export type { StorageInspector, StorageUnavailable } from "./ports/storage-inspector.ts";
