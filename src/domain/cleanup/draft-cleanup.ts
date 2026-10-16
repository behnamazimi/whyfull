import type { AbsolutePath } from "../path/absolute-path.ts";
import type { ClassificationResult } from "../rules/classification.ts";
import { RemedyKind } from "../rules/remedy.ts";
import { RuleScope } from "../rules/rule.ts";
import { SafetyLevel } from "../rules/safety-level.ts";
import type { DirectoryNode } from "../scan/directory-node.ts";
import { assertNever } from "../shared/assert-never.ts";
import { ByteSize } from "../size/byte-size.ts";
import {
  BlockReason,
  CleanupActionKind,
  type BlockedItem,
  type CartEntry,
  type CleanupAction,
  type CleanupDraft,
  type OwnerToolAction,
  type PathAction,
} from "./cleanup-plan.ts";

export interface DraftCleanupInput {
  readonly entries: readonly CartEntry[];
  readonly root: DirectoryNode;
  readonly classification: ClassificationResult;
}

const blocked = (entry: CartEntry, reason: BlockReason): BlockedItem => ({
  paths: [entry.path],
  rule: entry.rule,
  size: entry.size,
  reason,
  detail: undefined,
});

function remainderTargets(entry: CartEntry, input: DraftCleanupInput): readonly DirectoryNode[] {
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
  entry: CartEntry,
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
  const byTool = new Map<OwnerToolAction["tool"], CartEntry[]>();
  for (const entry of entries) {
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

export function draftCleanup(input: DraftCleanupInput): CleanupDraft {
  const actions: CleanupAction[] = [];
  const blockedItems: BlockedItem[] = [];
  for (const entry of input.entries) {
    if (entry.rule.safety === SafetyLevel.Protected) {
      blockedItems.push(blocked(entry, BlockReason.Protected));
      continue;
    }
    const { remedy } = entry.rule;
    switch (remedy.kind) {
      case RemedyKind.DeleteRegenerable:
        actions.push(...pathActions(entry, CleanupActionKind.Delete, input));
        break;
      case RemedyKind.MoveToTrash:
        actions.push(...pathActions(entry, CleanupActionKind.MoveToTrash, input));
        break;
      case RemedyKind.RunOwnerTool:
        break;
      case RemedyKind.ExplainOnly:
        blockedItems.push(blocked(entry, BlockReason.ManualOnly));
        break;
      default:
        assertNever(remedy);
    }
  }
  return { actions: [...actions, ...ownerToolActions(input.entries)], blocked: blockedItems };
}
