export { DirectoryNode, type DirectoryContents } from "./scan/directory-node.ts";
export { reviseTree, type Removal, type TreeRevision } from "./scan/revise-tree.ts";
export { largestFiles } from "./scan/largest-files.ts";
export type { NotableFile } from "./scan/notable-file.ts";
export { ScanIssueKind, type ScanIssue } from "./scan/scan-issue.ts";
export type { ScanSnapshot } from "./scan/scan-snapshot.ts";

export { KnownFolderId, type KnownFolder } from "./folders/known-folder.ts";
export { AbsolutePath, PathError } from "./path/absolute-path.ts";
export { PathBase, PathTemplate, type PathContext } from "./path/path-template.ts";

export { ByteSize } from "./size/byte-size.ts";
export { DecimalUnit } from "./size/units.ts";

export { assertNever } from "./shared/assert-never.ts";
export { Duration } from "./shared/duration.ts";
export { failure, success, type Result } from "./shared/result.ts";

export { Category } from "./rules/category.ts";
export {
  classify,
  type Classification,
  type ClassificationResult,
} from "./rules/classification.ts";
export {
  anyOf,
  containsMarkerFile,
  parentContainsMarkerFile,
  type Condition,
  type ConditionSubject,
} from "./rules/condition.ts";
export {
  anyDirectory,
  atPath,
  filesWithExtensionIn,
  LocatorKind,
  namedAnywhere,
  type Locator,
} from "./rules/locator.ts";
export {
  OwnerToolId,
  ProbeProblem,
  ToolProblem,
  toolNotReady,
  toolReady,
  type ToolReadiness,
} from "./rules/owner-tool.ts";
export {
  deleteRegenerable,
  emptyTrash,
  explainOnly,
  moveToTrash,
  RemedyKind,
  runOwnerTool,
  type Remedy,
} from "./rules/remedy.ts";
export {
  defineRule,
  RuleScope,
  type Rule,
  type RuleDefinition,
  type RulePack,
} from "./rules/rule.ts";
export { RuleId } from "./rules/rule-id.ts";
export { RuleIndex, type DuplicateRuleError, type Hotspot } from "./rules/rule-index.ts";
export { SafetyLevel } from "./rules/safety-level.ts";

export { diagnose, type DiagnosisInput } from "./insight/diagnose.ts";
export {
  compareFindings,
  FindingGroup,
  findingGroup,
  findingGroupOrder,
  sizeOfGroup,
} from "./insight/finding-group.ts";
export { isStale } from "./insight/staleness.ts";
export { safeSizeInside } from "./insight/safe-size-inside.ts";
export {
  FindingKind,
  type Finding,
  type KnownItemFinding,
  type UnexplainedFolderFinding,
} from "./insight/finding.ts";

export {
  defaultCleanupPolicy,
  defaultDiagnosisPolicy,
  defaultHistoryPolicy,
  defaultScanPolicy,
  type CleanupPolicy,
  type DiagnosisPolicy,
  type HistoryPolicy,
  type ScanPolicy,
} from "./policy/policy.ts";

export type { VolumeUsage } from "./volume/volume-usage.ts";

export {
  assistantPromptFor,
  PromptEntryKind,
  type AssistantPrompt,
  type AssistantPromptSubject,
  type PromptEntry,
} from "./prompt/assistant-prompt.ts";

export { VolumeRole, type StorageLayout, type VolumeSpace } from "./volume/storage-layout.ts";
export {
  breakDownUsage,
  UsageShareKind,
  type UsageBreakdown,
  type UsageBreakdownInput,
  type UsageShare,
} from "./accounting/usage-breakdown.ts";
export { folderScope, ScanScopeKind, type ScanScope } from "./scan/scan-scope.ts";

export { isSameItem, type ItemIdentity } from "./cleanup/item-identity.ts";
export {
  BlockReason,
  CartEntryKind,
  CleanupActionKind,
  isHighRiskAction,
  pathsOf,
  totalSizeOf,
  type ApprovedAction,
  type ApprovedPathAction,
  type BlockedItem,
  type CartEntry,
  type CleanupAction,
  type CleanupDraft,
  type CleanupPlan,
  type HighRiskAction,
  type HighRiskEntry,
  type OwnerToolAction,
  type PathAction,
  type RecognizedEntry,
} from "./cleanup/cleanup-plan.ts";
export { outcomeOfCart, type CartOutcome } from "./cleanup/cart-outcome.ts";
export type { HighRiskLimits } from "./cleanup/high-risk-limits.ts";
export {
  checkHighRisk,
  type HighRiskBlock,
  type HighRiskBlockReason,
  type HighRiskCheckInput,
} from "./cleanup/check-high-risk.ts";
export {
  highRiskWarnings,
  HighRiskWarning,
  type HighRiskWarningSubject,
} from "./cleanup/high-risk-warnings.ts";
export { runningOwnerApp } from "./cleanup/running-owner-app.ts";
export { draftCleanup, type DraftCleanupInput } from "./cleanup/draft-cleanup.ts";
export {
  OutcomeKind,
  summarizeCleanup,
  type ActionResult,
  type CleanupReport,
} from "./cleanup/cleanup-report.ts";
export {
  summarizeSnapshot,
  type FolderTotal,
  type SnapshotSubject,
  type SnapshotSummary,
} from "./history/snapshot-summary.ts";
export {
  ChangeDirection,
  compareSnapshots,
  sizeChange,
  type FolderGrowth,
  type SizeChange,
  type SnapshotDiff,
} from "./history/snapshot-diff.ts";
