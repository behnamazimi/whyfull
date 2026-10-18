import { assertNever, RemedyKind, SafetyLevel, type Rule } from "../../domain/index.ts";
import { UiCopy } from "./ui-copy.ts";

export function ruleTag(rule: Rule): string {
  if (rule.safety === SafetyLevel.Protected) return UiCopy.tags.keep;
  const { remedy } = rule;
  switch (remedy.kind) {
    case RemedyKind.DeleteRegenerable:
      return UiCopy.tags.safeToRemove;
    case RemedyKind.RunOwnerTool:
      return UiCopy.tags.safeWithTool;
    case RemedyKind.MoveToTrash:
      return UiCopy.tags.reviewThenTrash;
    case RemedyKind.EmptyTrash:
      return UiCopy.tags.emptyTrash;
    case RemedyKind.ExplainOnly:
      return UiCopy.tags.reviewYourself;
    default:
      return assertNever(remedy);
  }
}

export function ruleStatus(rule: Rule): string {
  if (rule.safety === SafetyLevel.Protected) return UiCopy.status.protected;
  const { remedy } = rule;
  switch (remedy.kind) {
    case RemedyKind.DeleteRegenerable:
      return UiCopy.status.remove;
    case RemedyKind.RunOwnerTool:
      return UiCopy.status.tool(UiCopy.ownerToolNames[remedy.tool]);
    case RemedyKind.MoveToTrash:
      return UiCopy.status.trash;
    case RemedyKind.EmptyTrash:
      return UiCopy.status.emptyTrash;
    case RemedyKind.ExplainOnly:
      return UiCopy.status.yourself;
    default:
      return assertNever(remedy);
  }
}

export function whoCleansUp(rule: Rule): string {
  if (rule.safety === SafetyLevel.Protected) return UiCopy.whoCleansUp.protected;
  const { remedy } = rule;
  switch (remedy.kind) {
    case RemedyKind.DeleteRegenerable:
      return UiCopy.whoCleansUp.remove;
    case RemedyKind.RunOwnerTool:
      return UiCopy.whoCleansUp.tool(UiCopy.ownerToolNames[remedy.tool]);
    case RemedyKind.MoveToTrash:
      return UiCopy.whoCleansUp.trash;
    case RemedyKind.EmptyTrash:
      return UiCopy.whoCleansUp.emptyTrash;
    case RemedyKind.ExplainOnly:
      return UiCopy.whoCleansUp.yourself;
    default:
      return assertNever(remedy);
  }
}

export const isCleanableByWhyfull = (rule: Rule): boolean =>
  rule.safety !== SafetyLevel.Protected && rule.remedy.kind !== RemedyKind.ExplainOnly;
