import { describe, expect, test } from "bun:test";
import { buildRuleIndex } from "../../src/application/index.ts";
import { RuleId, SafetyLevel } from "../../src/domain/index.ts";
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

  test("mark credentials, iCloud files and browser profiles as protected", () => {
    const built = buildRuleIndex(platform.rulePacks, platform.pathContext);
    if (!built.ok) throw new Error("rule index failed to build");
    const protectedPaths = built.value.hotspots
      .filter((hotspot) => hotspot.rule.safety === SafetyLevel.Protected)
      .map((hotspot) => `${hotspot.rule.id} ${hotspot.path.toString()}`);
    const expected = [
      `${RuleId.Keychains} /Users/sam/Library/Keychains`,
      `${RuleId.SshAndGpgKeys} /Users/sam/.ssh`,
      `${RuleId.SshAndGpgKeys} /Users/sam/.gnupg`,
      `${RuleId.ICloudDriveLocalFiles} /Users/sam/Library/Mobile Documents`,
      `${RuleId.BrowserProfiles} /Users/sam/Library/Application Support/Google/Chrome`,
      `${RuleId.BrowserProfiles} /Users/sam/Library/Safari`,
    ];
    for (const entry of expected) expect(protectedPaths).toContain(entry);
  });

  test("keep the Chrome cache rule apart from the protected Chrome profile", () => {
    const built = buildRuleIndex(platform.rulePacks, platform.pathContext);
    if (!built.ok) throw new Error("rule index failed to build");
    const cache = built.value.hotspots.find((hotspot) => hotspot.rule.id === RuleId.ChromeCache);
    expect(cache?.path.toString()).toBe("/Users/sam/Library/Caches/Google/Chrome");
  });

  // Running `npm exec` programs live in ~/.npm/_npx, so only the download cache is cleaned.
  test("clean only npm's download cache, not the programs npx keeps", () => {
    const built = buildRuleIndex(platform.rulePacks, platform.pathContext);
    if (!built.ok) throw new Error("rule index failed to build");
    const npm = built.value.hotspots.filter((hotspot) => hotspot.rule.id === RuleId.NpmCache);
    expect(npm.map((hotspot) => hotspot.path.toString())).toEqual(["/Users/sam/.npm/_cacache"]);
  });
});
