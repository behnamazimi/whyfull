import {
  atPath,
  Category,
  defineRule,
  deleteRegenerable,
  RuleId,
  RuleScope,
  SafetyLevel,
  type PathTemplate,
  type Rule,
  type RuleId as RuleIdentifier,
} from "../../../domain/index.ts";
import { MacPaths } from "../paths.ts";

const appCache = (id: RuleIdentifier, ...paths: readonly PathTemplate[]): Rule =>
  defineRule({
    id,
    category: Category.AppCaches,
    locator: atPath(...paths),
    safety: SafetyLevel.Regenerable,
    remedy: deleteRegenerable(),
  });

export const appCacheRules: readonly Rule[] = [
  appCache(RuleId.ChromeCache, MacPaths.chromeCache),
  appCache(RuleId.SafariCache, MacPaths.safariCache),
  appCache(RuleId.FirefoxCache, MacPaths.firefoxCache),
  appCache(RuleId.SlackCache, MacPaths.slackCache),
  appCache(RuleId.TeamsCache, MacPaths.teamsCache),
  appCache(RuleId.DiscordCache, MacPaths.discordCache),
  appCache(RuleId.SpotifyCache, MacPaths.spotifyCache),
  appCache(RuleId.NotionCache, ...MacPaths.notionCaches),
  defineRule({
    id: RuleId.ApplicationCaches,
    category: Category.AppCaches,
    locator: atPath(MacPaths.applicationCaches),
    scope: RuleScope.RemainderAfterMoreSpecificRules,
    safety: SafetyLevel.Regenerable,
    remedy: deleteRegenerable(),
  }),
  defineRule({
    id: RuleId.UserLogs,
    category: Category.Logs,
    locator: atPath(MacPaths.userLogs),
    safety: SafetyLevel.Regenerable,
    remedy: deleteRegenerable(),
  }),
];
