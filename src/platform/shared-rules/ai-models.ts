import {
  atPath,
  Category,
  defineRule,
  explainOnly,
  moveToTrash,
  RuleId,
  SafetyLevel,
  type Rule,
} from "../../domain/index.ts";
import { SharedPaths } from "./shared-paths.ts";

export const aiModelRules: readonly Rule[] = [
  defineRule({
    id: RuleId.OllamaModels,
    category: Category.AiModels,
    locator: atPath(SharedPaths.ollamaModels),
    safety: SafetyLevel.NeedsReview,
    remedy: explainOnly(),
  }),
  defineRule({
    id: RuleId.HuggingFaceCache,
    category: Category.AiModels,
    locator: atPath(SharedPaths.huggingFaceCache),
    safety: SafetyLevel.NeedsReview,
    remedy: moveToTrash(),
  }),
  defineRule({
    id: RuleId.LmStudioModels,
    category: Category.AiModels,
    locator: atPath(SharedPaths.lmStudioModels),
    safety: SafetyLevel.NeedsReview,
    remedy: explainOnly(),
  }),
];
