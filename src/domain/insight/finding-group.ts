import { assertNever } from "../shared/assert-never.ts";
import { SafetyLevel } from "../rules/safety-level.ts";
import { ByteSize } from "../size/byte-size.ts";
import { FindingKind, type Finding } from "./finding.ts";

/** What a person can do about a finding, from most to least useful. */
export const FindingGroup = {
  Safe: "safe",
  NeedsApp: "needs-app",
  Check: "check",
  Unrecognized: "unrecognized",
  Keep: "keep",
} as const;
export type FindingGroup = (typeof FindingGroup)[keyof typeof FindingGroup];

export const findingGroupOrder: readonly FindingGroup[] = [
  FindingGroup.Safe,
  FindingGroup.NeedsApp,
  FindingGroup.Check,
  FindingGroup.Unrecognized,
  FindingGroup.Keep,
];

function groupOfSafety(safety: SafetyLevel): FindingGroup {
  switch (safety) {
    case SafetyLevel.Regenerable:
      return FindingGroup.Safe;
    case SafetyLevel.SafeViaOwnerTool:
      return FindingGroup.NeedsApp;
    case SafetyLevel.NeedsReview:
      return FindingGroup.Check;
    case SafetyLevel.Protected:
      return FindingGroup.Keep;
    default:
      return assertNever(safety);
  }
}

export function findingGroup(finding: Finding): FindingGroup {
  switch (finding.kind) {
    case FindingKind.KnownItem:
      return groupOfSafety(finding.rule.safety);
    case FindingKind.UnexplainedFolder:
      return FindingGroup.Unrecognized;
    default:
      return assertNever(finding);
  }
}

export const compareFindings = (left: Finding, right: Finding): number =>
  findingGroupOrder.indexOf(findingGroup(left)) - findingGroupOrder.indexOf(findingGroup(right)) ||
  ByteSize.largestFirst(left.size, right.size);

export const sizeOfGroup = (findings: readonly Finding[], group: FindingGroup): ByteSize =>
  ByteSize.sum(
    findings.filter((finding) => findingGroup(finding) === group).map((finding) => finding.size),
  );
