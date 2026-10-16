import {
  RuleIndex,
  type DuplicateRuleError,
  type PathContext,
  type Result,
  type RulePack,
} from "../../domain/index.ts";

export const buildRuleIndex = (
  packs: readonly RulePack[],
  context: PathContext,
): Result<RuleIndex, DuplicateRuleError> =>
  RuleIndex.build(
    packs.flatMap((pack) => pack.rules),
    context,
  );
