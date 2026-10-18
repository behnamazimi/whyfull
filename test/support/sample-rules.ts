import {
  anyDirectory,
  atPath,
  Category,
  containsMarkerFile,
  defineRule,
  deleteRegenerable,
  filesWithExtensionIn,
  moveToTrash,
  namedAnywhere,
  OwnerToolId,
  parentContainsMarkerFile,
  PathTemplate,
  RuleId,
  RuleScope,
  runOwnerTool,
  SafetyLevel,
} from "../../src/domain/index.ts";

export const nodeModulesRule = defineRule({
  id: RuleId.NodeModules,
  category: Category.DeveloperFiles,
  locator: namedAnywhere("node_modules"),
  conditions: [parentContainsMarkerFile("package.json")],
  safety: SafetyLevel.Regenerable,
  remedy: deleteRegenerable(),
});

export const virtualEnvironmentRule = defineRule({
  id: RuleId.PythonVirtualEnvironment,
  category: Category.DeveloperFiles,
  locator: anyDirectory(),
  conditions: [containsMarkerFile("pyvenv.cfg")],
  safety: SafetyLevel.Regenerable,
  remedy: deleteRegenerable(),
});

export const applicationCachesRule = defineRule({
  id: RuleId.ApplicationCaches,
  category: Category.AppCaches,
  locator: atPath(PathTemplate.underHome("Library", "Caches")),
  scope: RuleScope.RemainderAfterMoreSpecificRules,
  safety: SafetyLevel.Regenerable,
  remedy: deleteRegenerable(),
});

export const homebrewCacheRule = defineRule({
  id: RuleId.HomebrewCache,
  category: Category.DeveloperFiles,
  locator: atPath(PathTemplate.underHome("Library", "Caches", "Homebrew")),
  safety: SafetyLevel.Regenerable,
  remedy: deleteRegenerable(),
});

/** The same folder, cleaned by an owner tool, for tests of plans that depend on a tool. */
export const homebrewOwnerToolRule = defineRule({
  id: RuleId.HomebrewCache,
  category: Category.DeveloperFiles,
  locator: atPath(PathTemplate.underHome("Library", "Caches", "Homebrew")),
  safety: SafetyLevel.SafeViaOwnerTool,
  remedy: runOwnerTool(OwnerToolId.SimulatorCleanup),
});

export const installersRule = defineRule({
  id: RuleId.DownloadedInstallers,
  category: Category.Installers,
  locator: filesWithExtensionIn(PathTemplate.underHome("Downloads"), ["dmg", "pkg"]),
  safety: SafetyLevel.NeedsReview,
  remedy: moveToTrash(),
});

export const sampleRules = [
  nodeModulesRule,
  virtualEnvironmentRule,
  applicationCachesRule,
  homebrewCacheRule,
  installersRule,
];
