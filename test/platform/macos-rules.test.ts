import { describe, expect, test } from "bun:test";
import { buildRuleIndex } from "../../src/application/index.ts";
import { LocatorKind, RuleId } from "../../src/domain/index.ts";
import { bunCommandRunner, systemClock } from "../../src/infrastructure/index.ts";
import { createMacOsPlatform } from "../../src/platform/index.ts";
import { pathOf } from "../support/domain-builders.ts";

const platform = createMacOsPlatform({
  home: pathOf("/Users/sam"),
  clock: systemClock,
  commands: bunCommandRunner,
});
const ruleIds = platform.rulePacks.flatMap((pack) => pack.rules.map((rule) => rule.id));

describe("macOS rule packs", () => {
  test("cover every rule id exactly once", () => {
    expect([...ruleIds].sort()).toEqual(Object.values(RuleId).sort());
  });

  test("build a rule index", () => {
    expect(buildRuleIndex(platform.rulePacks, platform.pathContext).ok).toBe(true);
  });

  test("never give two rules the same path", () => {
    const paths = platform.rulePacks
      .flatMap((pack) => pack.rules)
      .flatMap((rule) =>
        rule.locator.kind === LocatorKind.AtPath
          ? rule.locator.paths.map((template) => template.resolve(platform.pathContext).toString())
          : [],
      );
    expect(new Set(paths).size).toBe(paths.length);
  });
});
