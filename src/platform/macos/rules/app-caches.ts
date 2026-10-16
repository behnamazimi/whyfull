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
import { MacApp } from "../apps.ts";
import { MacPaths } from "../paths.ts";

const appCache = (id: RuleIdentifier, ownerApp: string, ...paths: readonly PathTemplate[]): Rule =>
  defineRule({
    id,
    ownerApps: [ownerApp],
    category: Category.AppCaches,
    locator: atPath(...paths),
    safety: SafetyLevel.Regenerable,
    remedy: deleteRegenerable(),
  });

export const appCacheRules: readonly Rule[] = [
  appCache(RuleId.ChromeCache, MacApp.Chrome, MacPaths.chromeCache),
  appCache(RuleId.SafariCache, MacApp.Safari, MacPaths.safariCache),
  appCache(RuleId.FirefoxCache, MacApp.Firefox, MacPaths.firefoxCache),
  appCache(RuleId.SlackCache, MacApp.Slack, MacPaths.slackCache),
  appCache(RuleId.TeamsCache, MacApp.Teams, MacPaths.teamsCache),
  appCache(RuleId.DiscordCache, MacApp.Discord, MacPaths.discordCache),
  appCache(RuleId.SpotifyCache, MacApp.Spotify, MacPaths.spotifyCache),
  appCache(RuleId.NotionCache, MacApp.Notion, ...MacPaths.notionCaches),
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
