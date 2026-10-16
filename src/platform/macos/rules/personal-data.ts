import {
  atPath,
  Category,
  defineRule,
  explainOnly,
  filesWithExtensionIn,
  moveToTrash,
  RuleId,
  SafetyLevel,
  type Rule,
} from "../../../domain/index.ts";
import { InstallerExtension, MacPaths } from "../paths.ts";

export const personalDataRules: readonly Rule[] = [
  defineRule({
    id: RuleId.IosDeviceBackups,
    category: Category.Backups,
    locator: atPath(MacPaths.iosDeviceBackups),
    safety: SafetyLevel.NeedsReview,
    remedy: moveToTrash(),
  }),
  defineRule({
    id: RuleId.DownloadedInstallers,
    category: Category.Installers,
    locator: filesWithExtensionIn(MacPaths.downloads, Object.values(InstallerExtension)),
    safety: SafetyLevel.NeedsReview,
    remedy: moveToTrash(),
  }),
  defineRule({
    id: RuleId.Trash,
    category: Category.Trash,
    locator: atPath(MacPaths.trash),
    safety: SafetyLevel.NeedsReview,
    remedy: explainOnly(),
  }),
  defineRule({
    id: RuleId.SteamGames,
    category: Category.Games,
    locator: atPath(MacPaths.steamGames),
    safety: SafetyLevel.NeedsReview,
    remedy: explainOnly(),
  }),
  defineRule({
    id: RuleId.PhotosLibrary,
    category: Category.PhotosAndMessages,
    locator: atPath(MacPaths.photosLibrary),
    safety: SafetyLevel.Protected,
    remedy: explainOnly(),
  }),
  defineRule({
    id: RuleId.MessagesAttachments,
    category: Category.PhotosAndMessages,
    locator: atPath(MacPaths.messagesAttachments),
    safety: SafetyLevel.Protected,
    remedy: explainOnly(),
  }),
  defineRule({
    id: RuleId.AppleAerialWallpapers,
    category: Category.PhotosAndMessages,
    locator: atPath(MacPaths.aerialWallpapers),
    safety: SafetyLevel.NeedsReview,
    remedy: explainOnly(),
  }),
];
