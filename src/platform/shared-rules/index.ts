import type { RulePack } from "../../domain/index.ts";
import { aiModelRules } from "./ai-models.ts";
import { developerProjectRules } from "./developer-projects.ts";

export { PersonalFileExtensions, SharedPaths } from "./shared-paths.ts";

export const sharedRulePack: RulePack = {
  name: "shared",
  rules: [...developerProjectRules, ...aiModelRules],
};
