import { describe, expect, test } from "bun:test";
import {
  ByteSize,
  classify,
  defaultDiagnosisPolicy,
  diagnose,
  Duration,
  FindingKind,
  RuleId,
  RuleIndex,
  type KnownItemFinding,
  type RuleIndex as RuleIndexType,
} from "../../src/domain/index.ts";
import { buildTree, pathOf, REFERENCE_DATE } from "../support/domain-builders.ts";
import { nodeModulesRule, sampleRules } from "../support/sample-rules.ts";

const HOME = pathOf("/Users/sam");
const STALE_AGE_DAYS = 365;
const LONG_AGO = new Date(REFERENCE_DATE.getTime() - Duration.ofDays(STALE_AGE_DAYS).milliseconds);

const GENERIC_CACHES = ByteSize.fromGigabytes(1);
const HOMEBREW_CACHE = ByteSize.fromGigabytes(3);
const OUTER_NODE_MODULES = ByteSize.fromGigabytes(2);
const NESTED_NODE_MODULES = ByteSize.fromMegabytes(500);
const ORPHAN_NODE_MODULES = ByteSize.fromGigabytes(1);
const VIRTUAL_ENVIRONMENT = ByteSize.fromGigabytes(1);
const INSTALLER = ByteSize.fromGigabytes(4);
const LOOSE_MOVIE = ByteSize.fromGigabytes(5);
const MOVIE_PROJECT = ByteSize.fromMegabytes(600);
const MOVIE_PROJECT_NAMES = ["a", "b", "c", "d", "e"];

const home = buildTree(HOME.toString(), {
  children: [
    {
      name: "Library",
      children: [
        {
          name: "Caches",
          ownFilesSize: GENERIC_CACHES,
          children: [{ name: "Homebrew", ownFilesSize: HOMEBREW_CACHE }],
        },
      ],
    },
    {
      name: "code",
      children: [
        {
          name: "app",
          markers: ["package.json"],
          children: [
            {
              name: "node_modules",
              ownFilesSize: OUTER_NODE_MODULES,
              modified: LONG_AGO,
              children: [
                {
                  name: "left-pad",
                  markers: ["package.json"],
                  modified: LONG_AGO,
                  children: [
                    {
                      name: "node_modules",
                      ownFilesSize: NESTED_NODE_MODULES,
                      modified: LONG_AGO,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: "not-a-project",
          children: [{ name: "node_modules", ownFilesSize: ORPHAN_NODE_MODULES }],
        },
        {
          name: "py",
          children: [{ name: ".venv", markers: ["pyvenv.cfg"], ownFilesSize: VIRTUAL_ENVIRONMENT }],
        },
      ],
    },
    {
      name: "Downloads",
      notableFiles: [
        { name: "Tool.dmg", size: INSTALLER },
        { name: "holiday.mp4", size: LOOSE_MOVIE },
      ],
    },
    {
      name: "Movies",
      children: MOVIE_PROJECT_NAMES.map((name) => ({ name, ownFilesSize: MOVIE_PROJECT })),
    },
  ],
});

function buildIndex(): RuleIndexType {
  const built = RuleIndex.build(sampleRules, { home: HOME });
  if (!built.ok) throw new Error("sample rules must be unique");
  return built.value;
}

const index = buildIndex();
const classification = classify(home, index);
const findings = diagnose({
  root: home,
  classification,
  policy: defaultDiagnosisPolicy,
  now: REFERENCE_DATE,
});

function knownFinding(ruleId: RuleId): KnownItemFinding {
  const found = findings.find(
    (finding): finding is KnownItemFinding =>
      finding.kind === FindingKind.KnownItem && finding.rule.id === ruleId,
  );
  if (found === undefined) throw new Error(`No finding for ${ruleId}`);
  return found;
}

describe("RuleIndex", () => {
  test("rejects duplicate rule ids", () => {
    expect(RuleIndex.build([nodeModulesRule, nodeModulesRule], { home: HOME })).toEqual({
      ok: false,
      error: { duplicateId: RuleId.NodeModules },
    });
  });

  test("collects marker files that the scanner must record", () => {
    expect([...index.markerFileNames].sort()).toEqual(["package.json", "pyvenv.cfg"]);
  });

  test("lists fixed-location rules as hotspots", () => {
    expect(index.hotspots.map((hotspot) => hotspot.path.toString()).sort()).toEqual([
      "/Users/sam/Library/Caches",
      "/Users/sam/Library/Caches/Homebrew",
    ]);
  });
});

describe("classify and diagnose", () => {
  test("a specific rule carves its share out of a general one", () => {
    expect(knownFinding(RuleId.HomebrewCache).size).toEqual(HOMEBREW_CACHE);
    expect(knownFinding(RuleId.ApplicationCaches).size).toEqual(GENERIC_CACHES);
  });

  test("nested matches of the same rule are counted once, inside the outer one", () => {
    const nodeModules = knownFinding(RuleId.NodeModules);
    expect(nodeModules.size).toEqual(OUTER_NODE_MODULES.plus(NESTED_NODE_MODULES));
    expect(nodeModules.locations.length).toBe(1);
  });

  test("conditions keep look-alike folders out", () => {
    const nodeModules = knownFinding(RuleId.NodeModules);
    const paths = nodeModules.locations.map((location) => location.path.toString());
    expect(paths).not.toContain("/Users/sam/code/not-a-project/node_modules");
  });

  test("marks items untouched for longer than the policy as stale", () => {
    const nodeModules = knownFinding(RuleId.NodeModules);
    expect(nodeModules.staleSize).toEqual(nodeModules.size);
  });

  test("matches folders by their contents and files by extension", () => {
    expect(knownFinding(RuleId.PythonVirtualEnvironment).size).toEqual(VIRTUAL_ENVIRONMENT);
    expect(knownFinding(RuleId.DownloadedInstallers).size).toEqual(INSTALLER);
  });

  test("reports the folder that explains unknown space, not its tiny parts", () => {
    const unexplained = findings
      .filter((finding) => finding.kind === FindingKind.UnexplainedFolder)
      .map((finding) => [finding.path.toString(), finding.size.bytes]);
    expect(unexplained).toEqual([
      ["/Users/sam/Downloads", LOOSE_MOVIE.bytes],
      ["/Users/sam/Movies", MOVIE_PROJECT.bytes * MOVIE_PROJECT_NAMES.length],
      ["/Users/sam/code/not-a-project/node_modules", ORPHAN_NODE_MODULES.bytes],
    ]);
  });

  test("orders findings largest first", () => {
    const sizes = findings.map((finding) => finding.size.bytes);
    expect(sizes).toEqual([...sizes].sort((left, right) => right - left));
  });
});
