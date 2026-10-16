import type { RulePack } from "../../../domain/index.ts";
import { appCacheRules } from "./app-caches.ts";
import { containerRules } from "./containers.ts";
import { developerToolRules } from "./developer-tools.ts";
import { personalDataRules } from "./personal-data.ts";

export const macOsRulePack: RulePack = {
  name: "macos",
  rules: [...containerRules, ...developerToolRules, ...appCacheRules, ...personalDataRules],
};
