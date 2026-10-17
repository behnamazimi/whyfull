import { describe, expect, test } from "bun:test";
import {
  atPath,
  ByteSize,
  Category,
  childNamed,
  childStartingWith,
  classify,
  defineRule,
  deleteRegenerable,
  inMatchingChildren,
  PathTemplate,
  RuleId,
  RuleIndex,
  SafetyLevel,
} from "../../src/domain/index.ts";
import { buildTree, pathOf } from "../support/domain-builders.ts";

const HOME = pathOf("/Users/sam");
const CACHE_SIZE = ByteSize.fromMegabytes(10);
const HISTORY_SIZE = ByteSize.fromMegabytes(5);
const WORKER_CACHE_SIZE = ByteSize.fromMegabytes(7);
const UNRELATED_CACHE_SIZE = ByteSize.fromMegabytes(3);

const browserCaches = defineRule({
  id: RuleId.ChromeProfileCaches,
  category: Category.AppCaches,
  locator: inMatchingChildren(
    PathTemplate.underHome("Library", "Application Support", "Browser"),
    [childNamed("Default"), childStartingWith("Profile ")],
    [["Cache"], ["Service Worker", "CacheStorage"]],
  ),
  safety: SafetyLevel.Regenerable,
  remedy: deleteRegenerable(),
});

const driveRule = defineRule({
  id: RuleId.GoogleDriveOfflineData,
  category: Category.AppCaches,
  locator: atPath(PathTemplate.underHome("Library", "Application Support", "Google", "DriveFS")),
  safety: SafetyLevel.Protected,
  remedy: deleteRegenerable(),
});

const profile = (name: string) => ({
  name,
  children: [
    { name: "Cache", ownFilesSize: CACHE_SIZE },
    { name: "History", ownFilesSize: HISTORY_SIZE },
    {
      name: "Service Worker",
      children: [{ name: "CacheStorage", ownFilesSize: WORKER_CACHE_SIZE }],
    },
  ],
});

const tree = buildTree(HOME.toString(), {
  children: [
    {
      name: "Library",
      children: [
        {
          name: "Application Support",
          children: [
            {
              name: "Browser",
              children: [
                profile("Default"),
                profile("Profile 2"),
                profile("Guest Profile"),
                { name: "Cache", ownFilesSize: UNRELATED_CACHE_SIZE },
              ],
            },
            { name: "Elsewhere", children: [profile("Default")] },
          ],
        },
      ],
    },
  ],
});

const classifiedPaths = (): string[] => {
  const built = RuleIndex.build([browserCaches, driveRule], { home: HOME });
  if (!built.ok) throw new Error("rules should build");
  return classify(tree, built.value)
    .classifications.filter((item) => item.rule.id === RuleId.ChromeProfileCaches)
    .map((item) => item.path.toString())
    .sort();
};

describe("rules for named subfolders inside matching child folders", () => {
  const base = `${HOME.toString()}/Library/Application Support/Browser`;

  test("match cache folders in the default and numbered profiles", () => {
    expect(classifiedPaths()).toEqual([
      `${base}/Default/Cache`,
      `${base}/Default/Service Worker/CacheStorage`,
      `${base}/Profile 2/Cache`,
      `${base}/Profile 2/Service Worker/CacheStorage`,
    ]);
  });

  test("leave other data in the same profile alone", () => {
    expect(classifiedPaths().some((path) => path.endsWith("History"))).toBe(false);
  });

  test("ignore profiles whose name does not match, and folders outside the parent", () => {
    const paths = classifiedPaths();
    expect(paths.some((path) => path.includes("Guest Profile"))).toBe(false);
    expect(paths.some((path) => path.includes("Elsewhere"))).toBe(false);
    expect(paths).not.toContain(`${base}/Cache`);
  });
});
