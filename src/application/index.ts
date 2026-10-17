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
export type {
  AppActivity,
  CleanupFailure,
  CleanupJournal,
  FileInspector,
  FileRemover,
  JournalEntryId,
  OwnerTools,
  SizeMeter,
  ToolFailure,
  TrashBin,
} from "./ports/cleanup-ports.ts";
export { PlanCleanup, type PlanCleanupDependencies } from "./use-cases/plan-cleanup.ts";
export {
  CleanupEventKind,
  ExecuteCleanup,
  type CleanupEvent,
  type ExecuteCleanupDependencies,
} from "./use-cases/execute-cleanup.ts";
export type { SnapshotRepository } from "./ports/snapshot-repository.ts";
export { RecordScanHistory } from "./use-cases/record-scan-history.ts";
