import { describe, expect, test } from "bun:test";
import {
  atPath,
  Category,
  defineRule,
  deleteRegenerable,
  PathTemplate,
  RuleId,
  runningOwnerApp,
  SafetyLevel,
} from "../../src/domain/index.ts";

const CHROME = "Google Chrome";
const rule = (ownerApps: readonly string[]) =>
  defineRule({
    id: RuleId.ChromeCache,
    category: Category.AppCaches,
    locator: atPath(PathTemplate.underHome("Library", "Caches", "Google")),
    safety: SafetyLevel.Regenerable,
    remedy: deleteRegenerable(),
    ownerApps,
  });

describe("runningOwnerApp", () => {
  test("names the owner app that is running", () => {
    expect(runningOwnerApp([rule([CHROME])], new Set([CHROME, "Finder"]))).toBe(CHROME);
  });

  test("finds nothing when the owner app is closed or the rule has none", () => {
    expect(runningOwnerApp([rule([CHROME])], new Set(["Finder"]))).toBeUndefined();
    expect(runningOwnerApp([rule([])], new Set([CHROME]))).toBeUndefined();
  });
});
