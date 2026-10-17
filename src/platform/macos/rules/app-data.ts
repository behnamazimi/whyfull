import {
  atPath,
  Category,
  defineRule,
  explainOnly,
  RuleId,
  SafetyLevel,
  type Rule,
} from "../../../domain/index.ts";
import { MacPaths } from "../paths.ts";

export const appDataRules: readonly Rule[] = [
  defineRule({
    id: RuleId.GoogleDriveOfflineData,
    category: Category.SystemAndApps,
    locator: atPath(MacPaths.googleDriveOfflineData),
    safety: SafetyLevel.Protected,
    remedy: explainOnly(),
  }),
  defineRule({
    id: RuleId.CursorChatData,
    category: Category.SystemAndApps,
    locator: atPath(MacPaths.cursorChatData),
    safety: SafetyLevel.NeedsReview,
    remedy: explainOnly(),
  }),
];
