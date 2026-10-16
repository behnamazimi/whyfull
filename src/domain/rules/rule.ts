import type { Category } from "./category.ts";
import type { Condition } from "./condition.ts";
import type { Locator } from "./locator.ts";
import type { Remedy } from "./remedy.ts";
import type { RuleId } from "./rule-id.ts";
import type { SafetyLevel } from "./safety-level.ts";

export const RuleScope = {
  WholeFolder: "whole-folder",
  RemainderAfterMoreSpecificRules: "remainder-after-more-specific-rules",
} as const;
export type RuleScope = (typeof RuleScope)[keyof typeof RuleScope];

export interface Rule {
  readonly id: RuleId;
  readonly category: Category;
  readonly locator: Locator;
  readonly conditions: readonly Condition[];
  readonly scope: RuleScope;
  readonly safety: SafetyLevel;
  readonly remedy: Remedy;
}

export type RuleDefinition = Omit<Rule, "conditions" | "scope"> & {
  readonly conditions?: readonly Condition[];
  readonly scope?: RuleScope;
};

export const defineRule = ({
  conditions = [],
  scope = RuleScope.WholeFolder,
  ...definition
}: RuleDefinition): Rule => ({ ...definition, conditions, scope });

export interface RulePack {
  readonly name: string;
  readonly rules: readonly Rule[];
}
