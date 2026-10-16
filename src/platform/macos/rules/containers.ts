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
import { SharedPaths } from "../../shared-rules/index.ts";
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
  defineRule({
    id: RuleId.ColimaVirtualMachine,
    category: Category.ContainersAndVirtualMachines,
    locator: atPath(SharedPaths.colima),
    safety: SafetyLevel.NeedsReview,
    remedy: explainOnly(),
  }),
  defineRule({
    id: RuleId.VirtualBoxVirtualMachines,
    category: Category.ContainersAndVirtualMachines,
    locator: atPath(MacPaths.virtualBox),
    safety: SafetyLevel.NeedsReview,
    remedy: explainOnly(),
  }),
  defineRule({
    id: RuleId.VmwareFusionVirtualMachines,
    category: Category.ContainersAndVirtualMachines,
    locator: atPath(MacPaths.vmwareFusion),
    safety: SafetyLevel.NeedsReview,
    remedy: explainOnly(),
  }),
  defineRule({
    id: RuleId.VagrantBoxes,
    category: Category.ContainersAndVirtualMachines,
    locator: atPath(SharedPaths.vagrantBoxes),
    safety: SafetyLevel.NeedsReview,
    remedy: explainOnly(),
  }),
];
