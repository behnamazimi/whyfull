import type { AbsolutePath } from "../path/absolute-path.ts";
import type { ClassificationResult } from "../rules/classification.ts";
import { RemedyKind } from "../rules/remedy.ts";
import { RuleScope } from "../rules/rule.ts";
import { SafetyLevel } from "../rules/safety-level.ts";
import type { DirectoryNode } from "../scan/directory-node.ts";
import { assertNever } from "../shared/assert-never.ts";
import { ByteSize } from "../size/byte-size.ts";
import { checkHighRisk } from "./check-high-risk.ts";
import {
  BlockReason,
  CartEntryKind,
  CleanupActionKind,
  type BlockedItem,
  type CartEntry,
  type CleanupAction,
  type CleanupDraft,
  type HighRiskEntry,
  type OwnerToolAction,
  type PathAction,
  type RecognizedEntry,
} from "./cleanup-plan.ts";
import type { HighRiskLimits } from "./high-risk-limits.ts";

export interface DraftCleanupInput {
  readonly entries: readonly CartEntry[];
  readonly root: DirectoryNode;
  readonly classification: ClassificationResult;
  readonly highRiskLimits: HighRiskLimits;
  readonly protectedLocations: readonly AbsolutePath[];
}

const blocked = (entry: CartEntry, reason: BlockReason, rule = entry.rule): BlockedItem => ({
  paths: [entry.path],
  rule,
  size: entry.size,
  reason,
  detail: undefined,
});

function remainderTargets(
  entry: RecognizedEntry,
  input: DraftCleanupInput,
): readonly DirectoryNode[] {
  const folder = input.root.find(entry.path);
  if (folder === undefined) return [];
  const carvedOut: readonly AbsolutePath[] = input.classification.classifications
    .filter((item) => item.rule.id !== entry.rule.id && item.path.isInside(entry.path))
    .map((item) => item.path);
  return folder.children.filter(
    (child) => !carvedOut.some((path) => path.isSameOrInside(child.path)),
  );
}

function pathActions(
  entry: RecognizedEntry,
  kind: PathAction["kind"],
  input: DraftCleanupInput,
): readonly PathAction[] {
  if (entry.rule.scope === RuleScope.WholeFolder) {
    return [{ kind, path: entry.path, rule: entry.rule, size: entry.size }];
  }
  return remainderTargets(entry, input).map((child) => ({
    kind,
    path: child.path,
    rule: entry.rule,
    size: child.totalSize,
  }));
}

function ownerToolActions(entries: readonly CartEntry[]): readonly OwnerToolAction[] {
  const byTool = new Map<OwnerToolAction["tool"], RecognizedEntry[]>();
  for (const entry of entries) {
    if (entry.kind !== CartEntryKind.Recognized) continue;
    if (entry.rule.remedy.kind !== RemedyKind.RunOwnerTool) continue;
    const group = byTool.get(entry.rule.remedy.tool) ?? [];
    group.push(entry);
    byTool.set(entry.rule.remedy.tool, group);
  }
  return [...byTool.entries()].flatMap(([tool, group]): OwnerToolAction[] => {
    const [firstRule, ...otherRules] = [...new Set(group.map((entry) => entry.rule))];
    if (firstRule === undefined) return [];
    return [
      {
        kind: CleanupActionKind.RunOwnerTool,
        tool,
        paths: group.map((entry) => entry.path),
        rules: [firstRule, ...otherRules],
        size: ByteSize.sum(group.map((entry) => entry.size)),
      },
    ];
  });
}

type Drafted = CleanupAction | BlockedItem;

function draftRecognized(entry: RecognizedEntry, input: DraftCleanupInput): readonly Drafted[] {
  if (entry.rule.safety === SafetyLevel.Protected) return [blocked(entry, BlockReason.Protected)];
  const { remedy } = entry.rule;
  switch (remedy.kind) {
    case RemedyKind.DeleteRegenerable:
      return pathActions(entry, CleanupActionKind.Delete, input);
    case RemedyKind.MoveToTrash:
      return pathActions(entry, CleanupActionKind.MoveToTrash, input);
    case RemedyKind.RunOwnerTool:
      return [];
    case RemedyKind.ExplainOnly:
      return [blocked(entry, BlockReason.ManualOnly)];
    default:
      return assertNever(remedy);
  }
}

function draftHighRisk(entry: HighRiskEntry, input: DraftCleanupInput): Drafted {
  if (entry.scannedIdentity === undefined) return blocked(entry, BlockReason.ChangedSinceScan);
  const found = checkHighRisk({
    target: entry.path,
    limits: input.highRiskLimits,
    protectedLocations: input.protectedLocations,
    classifications: input.classification.classifications,
  });
  if (found !== undefined) return blocked(entry, found.reason, found.rule ?? entry.rule);
  return {
    kind: CleanupActionKind.DeleteHighRisk,
    path: entry.path,
    size: entry.size,
    fileCount: entry.fileCount,
    scannedIdentity: entry.scannedIdentity,
    rule: entry.rule,
  };
}

const isBlocked = (drafted: Drafted): drafted is BlockedItem => "reason" in drafted;
const isAction = (drafted: Drafted): drafted is CleanupAction => !isBlocked(drafted);

export function draftCleanup(input: DraftCleanupInput): CleanupDraft {
  const drafted = input.entries.flatMap((entry): readonly Drafted[] => {
    switch (entry.kind) {
      case CartEntryKind.Recognized:
        return draftRecognized(entry, input);
      case CartEntryKind.HighRisk:
        return [draftHighRisk(entry, input)];
      default:
        return assertNever(entry);
    }
  });
  return {
    actions: [...drafted.filter(isAction), ...ownerToolActions(input.entries)],
    blocked: drafted.filter(isBlocked),
  };
}
