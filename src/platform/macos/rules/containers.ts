import {
  atPath,
  Category,
  defineRule,
  explainOnly,
  OwnerToolId,
  RuleId,
  runOwnerTool,
  SafetyLevel,
  type Rule,
} from "../../../domain/index.ts";
import { MacPaths } from "../paths.ts";

export const containerRules: readonly Rule[] = [
  defineRule({
    id: RuleId.DockerDesktop,
    category: Category.ContainersAndVirtualMachines,
    locator: atPath(MacPaths.dockerDesktop),
    safety: SafetyLevel.SafeViaOwnerTool,
    remedy: runOwnerTool(OwnerToolId.DockerPrune),
  }),
  defineRule({
    id: RuleId.OrbStack,
    category: Category.ContainersAndVirtualMachines,
    locator: atPath(MacPaths.orbStack),
    safety: SafetyLevel.NeedsReview,
    remedy: explainOnly(),
  }),
  defineRule({
    id: RuleId.UtmVirtualMachines,
    category: Category.ContainersAndVirtualMachines,
    locator: atPath(MacPaths.utm),
    safety: SafetyLevel.NeedsReview,
    remedy: explainOnly(),
  }),
  defineRule({
    id: RuleId.ParallelsVirtualMachines,
    category: Category.ContainersAndVirtualMachines,
    locator: atPath(MacPaths.parallels),
    safety: SafetyLevel.NeedsReview,
    remedy: explainOnly(),
  }),
];
