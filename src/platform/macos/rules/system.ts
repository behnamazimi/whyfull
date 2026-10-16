import {
  atPath,
  Category,
  defineRule,
  explainOnly,
  RuleId,
  RuleScope,
  SafetyLevel,
  type Rule,
} from "../../../domain/index.ts";
import { SystemPaths } from "../paths.ts";

export const systemRules: readonly Rule[] = [
  defineRule({
    id: RuleId.InstalledApplications,
    category: Category.SystemAndApps,
    locator: atPath(SystemPaths.applications),
    safety: SafetyLevel.NeedsReview,
    remedy: explainOnly(),
  }),
  defineRule({
    id: RuleId.MacOsSystemFiles,
    category: Category.SystemAndApps,
    locator: atPath(SystemPaths.systemFiles),
    safety: SafetyLevel.Protected,
    remedy: explainOnly(),
  }),
  defineRule({
    id: RuleId.VirtualMemoryFiles,
    category: Category.SystemAndApps,
    locator: atPath(SystemPaths.virtualMemory),
    safety: SafetyLevel.Protected,
    remedy: explainOnly(),
  }),
  defineRule({
    id: RuleId.TemporaryFiles,
    category: Category.SystemAndApps,
    locator: atPath(SystemPaths.temporaryFiles),
    safety: SafetyLevel.Protected,
    remedy: explainOnly(),
  }),
  defineRule({
    id: RuleId.HomebrewInstallation,
    category: Category.DeveloperFiles,
    locator: atPath(SystemPaths.homebrew),
    scope: RuleScope.RemainderAfterMoreSpecificRules,
    safety: SafetyLevel.NeedsReview,
    remedy: explainOnly(),
  }),
];
