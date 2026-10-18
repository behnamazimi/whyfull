import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import {
  CleanupEventKind,
  ExecuteCleanup,
  PlanCleanup,
  type CleanupEvent,
} from "../../src/application/index.ts";
import {
  BlockReason,
  ByteSize,
  CartEntryKind,
  CleanupActionKind,
  classify,
  defineRule,
  deleteRegenerable,
  draftCleanup,
  explainOnly,
  moveToTrash,
  OutcomeKind,
  OwnerToolId,
  ProbeProblem,
  RuleId,
  RuleIndex,
  runOwnerTool,
  SafetyLevel,
  ToolProblem,
  atPath,
  Category,
  defaultCleanupPolicy,
  PathTemplate,
  type CartEntry,
  type CleanupPlan,
} from "../../src/domain/index.ts";
import { buildTree, pathOf } from "../support/domain-builders.ts";
import {
  appsRunning,
  FakeFileSystem,
  FakeOwnerTools,
  MemoryJournal,
  volumeWithAvailable,
} from "../support/fake-cleanup-ports.ts";
import { sampleHighRiskLimits } from "../support/sample-high-risk-limits.ts";
import { applicationCachesRule, homebrewOwnerToolRule } from "../support/sample-rules.ts";

const HOME = pathOf("/Users/sam");
const GIGABYTE = ByteSize.fromGigabytes(1);

const chromeCacheRule = defineRule({
  id: RuleId.ChromeCache,
  category: Category.AppCaches,
  locator: atPath(PathTemplate.underHome("Library", "Caches", "Google")),
  safety: SafetyLevel.Regenerable,
  remedy: deleteRegenerable(),
  ownerApps: ["Google Chrome"],
});
const backupsRule = defineRule({
  id: RuleId.IosDeviceBackups,
  category: Category.Backups,
  locator: atPath(PathTemplate.underHome("Backups")),
  safety: SafetyLevel.NeedsReview,
  remedy: moveToTrash(),
});
const steamRule = defineRule({
  id: RuleId.SteamGames,
  category: Category.Games,
  locator: atPath(PathTemplate.underHome("Steam")),
  safety: SafetyLevel.NeedsReview,
  remedy: explainOnly(),
});
const dockerRule = defineRule({
  id: RuleId.DockerDesktop,
  category: Category.ContainersAndVirtualMachines,
  locator: atPath(PathTemplate.underHome("Docker")),
  safety: SafetyLevel.SafeViaOwnerTool,
  remedy: runOwnerTool(OwnerToolId.DockerPrune),
});
const rules = [
  applicationCachesRule,
  homebrewOwnerToolRule,
  chromeCacheRule,
  backupsRule,
  steamRule,
  dockerRule,
];

const home = buildTree(HOME.toString(), {
  children: [
    {
      name: "Library",
      children: [
        {
          name: "Caches",
          children: [
            { name: "Homebrew", ownFilesSize: GIGABYTE },
            { name: "Google", ownFilesSize: GIGABYTE },
            { name: "com.example.app", ownFilesSize: GIGABYTE },
            { name: "com.example.other", ownFilesSize: GIGABYTE },
          ],
        },
      ],
    },
    { name: "Backups", ownFilesSize: GIGABYTE },
    { name: "Steam", ownFilesSize: GIGABYTE },
    { name: "Docker", ownFilesSize: GIGABYTE },
  ],
});

const index = RuleIndex.build(rules, { home: HOME });
if (!index.ok) throw new Error("rules must be unique");
const classification = classify(home, index.value);
const entries: CartEntry[] = classification.classifications.map((item) => ({
  kind: CartEntryKind.Recognized,
  path: item.path,
  rule: item.rule,
  size: item.size,
}));
const draft = draftCleanup({
  entries,
  root: home,
  classification,
  highRiskLimits: sampleHighRiskLimits,
  protectedLocations: [],
});

function fileSystemWithEverything(): FakeFileSystem {
  const files = new FakeFileSystem();
  for (const node of home.walk()) files.add(node.path);
  return files;
}

function planner(
  files: FakeFileSystem,
  running: string[] = [],
  tools = [OwnerToolId.SimulatorCleanup],
) {
  return new PlanCleanup({
    files,
    apps: appsRunning(...running),
    ownerTools: new FakeOwnerTools(new Set(tools)),
    protectedLocations: [HOME, pathOf("/Users/sam/Library"), pathOf("/Users/sam/Library/Caches")],
  });
}

async function collect(events: AsyncIterable<CleanupEvent>): Promise<CleanupEvent[]> {
  const collected: CleanupEvent[] = [];
  for await (const event of events) collected.push(event);
  return collected;
}

describe("draftCleanup", () => {
  test("splits a general cache rule into its own subfolders, leaving specific ones alone", () => {
    const deleted = draft.actions
      .filter((action) => action.kind === CleanupActionKind.Delete)
      .map((action) => action.kind === CleanupActionKind.Delete && action.path.toString());
    expect(deleted.sort()).toEqual([
      "/Users/sam/Library/Caches/Google",
      "/Users/sam/Library/Caches/com.example.app",
      "/Users/sam/Library/Caches/com.example.other",
    ]);
  });

  test("groups owner tools and keeps manual-only items out", () => {
    const tools = draft.actions.flatMap((action) =>
      action.kind === CleanupActionKind.RunOwnerTool ? [action.tool] : [],
    );
    expect(tools.sort()).toEqual([OwnerToolId.DockerPrune, OwnerToolId.SimulatorCleanup].sort());
    expect(draft.blocked.map((item) => [item.rule?.id, item.reason])).toEqual([
      [RuleId.SteamGames, BlockReason.ManualOnly],
    ]);
  });
});

describe("PlanCleanup", () => {
  test("blocks caches of running apps, missing tools and changed items", async () => {
    const files = fileSystemWithEverything();
    files.add(pathOf("/Users/sam/Backups"), true);
    const plan = await planner(files, ["Google Chrome"]).plan(draft, HOME);
    const reasons = Object.fromEntries(
      plan.blocked.map((item): [string, string] => [item.rule?.id ?? "", item.reason]),
    );
    expect(reasons).toEqual({
      [RuleId.SteamGames]: BlockReason.ManualOnly,
      [RuleId.ChromeCache]: BlockReason.AppRunning,
      [RuleId.IosDeviceBackups]: BlockReason.ChangedSinceScan,
      [RuleId.DockerDesktop]: BlockReason.ToolMissing,
    });
  });

  test.each([
    [ProbeProblem.NotInstalled, BlockReason.ToolMissing],
    [ProbeProblem.Unusable, BlockReason.ToolUnusable],
    [ProbeProblem.NotRunning, BlockReason.ToolNotRunning],
    [ProbeProblem.NotResponding, BlockReason.ToolNotResponding],
    [ProbeProblem.WrongEngine, BlockReason.ToolWrongEngine],
  ] as const)("leaves out a tool that fails its check as %s", async (problem, reason) => {
    const ownerTools = new FakeOwnerTools(new Set([OwnerToolId.SimulatorCleanup]));
    ownerTools.becomeUnready(OwnerToolId.SimulatorCleanup, problem);
    const plan = await new PlanCleanup({
      files: fileSystemWithEverything(),
      apps: appsRunning(),
      ownerTools,
      protectedLocations: [],
    }).plan(draft, HOME);
    const blockedByTool = plan.blocked.find((item) => item.rule?.id === RuleId.HomebrewCache);
    expect(blockedByTool?.reason).toBe(reason);
    const blockedDocker = plan.blocked.find((item) => item.rule?.id === RuleId.DockerDesktop);
    expect(blockedDocker?.reason).toBe(BlockReason.ToolMissing);
    expect(plan.actions.some((action) => action.kind === CleanupActionKind.RunOwnerTool)).toBe(
      false,
    );
  });

  test("never approves protected locations or anything outside the scanned folder", async () => {
    const protectedDraft = {
      actions: [
        {
          kind: CleanupActionKind.Delete,
          path: pathOf("/Users/sam/Library"),
          rule: chromeCacheRule,
          size: GIGABYTE,
        },
        {
          kind: CleanupActionKind.Delete,
          path: pathOf("/Users/other/cache"),
          rule: chromeCacheRule,
          size: GIGABYTE,
        },
      ],
      blocked: [],
    } as const;
    const plan = await planner(fileSystemWithEverything()).plan(protectedDraft, HOME);
    expect(plan.actions).toEqual([]);
    expect(plan.blocked.map((item) => item.reason)).toEqual([
      BlockReason.Protected,
      BlockReason.OutsideScanRoot,
    ]);
  });
});

describe("ExecuteCleanup", () => {
  test("journals each action before and after, and reports freed and trashed space", async () => {
    const files = fileSystemWithEverything();
    const ownerTools = new FakeOwnerTools(new Set([OwnerToolId.SimulatorCleanup]));
    const journal = new MemoryJournal();
    const plan = await planner(files).plan(draft, HOME);
    const events = await collect(
      new ExecuteCleanup({
        apps: appsRunning(),
        volumes: volumeWithAvailable(
          GIGABYTE,
          GIGABYTE,
          ByteSize.fromGigabytes(2),
          ByteSize.fromGigabytes(5),
        ),
        files,
        trash: files,
        remover: files,
        ownerTools,
        sizeMeter: files,
        journal,
        policy: defaultCleanupPolicy,
      }).run(plan, HOME),
    );
    const finished = events.at(-1);
    if (finished?.kind !== CleanupEventKind.Finished) throw new Error("cleanup did not finish");
    expect(journal.intents).toHaveLength(plan.actions.length);
    expect(journal.outcomes.every((result) => result.outcome === OutcomeKind.Done)).toBe(true);
    expect(files.trashed).toEqual(["/Users/sam/Backups"]);
    expect(ownerTools.ran).toEqual([OwnerToolId.SimulatorCleanup]);
    expect(finished.report.movedToTrashSize).toEqual(GIGABYTE);
    expect(finished.report.removedSize).toEqual(ByteSize.sum([GIGABYTE, GIGABYTE, GIGABYTE]));
    expect(finished.report.measuredFreeSpaceGain).toEqual(ByteSize.fromGigabytes(4));
    const ownerToolResult = journal.outcomes.find(
      (result) => result.action.kind === CleanupActionKind.RunOwnerTool,
    );
    expect(ownerToolResult?.freed).toEqual(GIGABYTE);
  });

  test("counts an owner tool as freeing only the space the disk gained while it ran", async () => {
    const files = fileSystemWithEverything();
    const journal = new MemoryJournal();
    const plan = await planner(files).plan(draft, HOME);
    await collect(
      new ExecuteCleanup({
        apps: appsRunning(),
        volumes: volumeWithAvailable(GIGABYTE, GIGABYTE, GIGABYTE, GIGABYTE),
        files,
        trash: files,
        remover: files,
        ownerTools: new FakeOwnerTools(new Set([OwnerToolId.SimulatorCleanup])),
        sizeMeter: files,
        journal,
        policy: defaultCleanupPolicy,
      }).run(plan, HOME),
    );
    const ownerToolResult = journal.outcomes.find(
      (result) => result.action.kind === CleanupActionKind.RunOwnerTool,
    );
    expect(ownerToolResult?.outcome).toBe(OutcomeKind.Done);
    expect(ownerToolResult?.freed.isZero()).toBe(true);
  });

  async function runPlanWith(ownerTools: FakeOwnerTools) {
    const files = fileSystemWithEverything();
    const journal = new MemoryJournal();
    const plan = await planner(files, [], [OwnerToolId.SimulatorCleanup]).plan(draft, HOME);
    await collect(
      new ExecuteCleanup({
        apps: appsRunning(),
        volumes: volumeWithAvailable(),
        files,
        trash: files,
        remover: files,
        ownerTools,
        sizeMeter: files,
        journal,
        policy: defaultCleanupPolicy,
      }).run(plan, HOME),
    );
    return journal.outcomes.find((result) => result.action.kind === CleanupActionKind.RunOwnerTool);
  }

  test("does not run a tool that stopped being ready after review", async () => {
    const ownerTools = new FakeOwnerTools(new Set([OwnerToolId.SimulatorCleanup]));
    ownerTools.becomeUnready(OwnerToolId.SimulatorCleanup, ProbeProblem.NotRunning);
    const result = await runPlanWith(ownerTools);
    expect(ownerTools.ran).toEqual([]);
    expect(result?.outcome).toBe(OutcomeKind.Failed);
    expect(result?.problem).toBe(ToolProblem.NotRunning);
    expect(result?.detail).toBe(`check failed: ${ProbeProblem.NotRunning}`);
  });

  test("still skips a tool whose app was opened, before checking the tool", async () => {
    const xcodeOwnedRule = defineRule({
      id: RuleId.IosSimulators,
      category: Category.DeveloperFiles,
      locator: atPath(PathTemplate.underHome("Simulators")),
      ownerApps: ["Xcode"],
      safety: SafetyLevel.SafeViaOwnerTool,
      remedy: runOwnerTool(OwnerToolId.SimulatorCleanup),
    });
    const ownerTools = new FakeOwnerTools(new Set([OwnerToolId.SimulatorCleanup]));
    ownerTools.becomeUnready(OwnerToolId.SimulatorCleanup, ProbeProblem.NotRunning);
    const journal = new MemoryJournal();
    const action = {
      kind: CleanupActionKind.RunOwnerTool,
      tool: OwnerToolId.SimulatorCleanup,
      paths: [pathOf("/Users/sam/Simulators")],
      rules: [xcodeOwnedRule],
      size: GIGABYTE,
    } as const;
    await collect(
      new ExecuteCleanup({
        apps: appsRunning("Xcode"),
        volumes: volumeWithAvailable(),
        files: fileSystemWithEverything(),
        trash: fileSystemWithEverything(),
        remover: fileSystemWithEverything(),
        ownerTools,
        sizeMeter: fileSystemWithEverything(),
        journal,
        policy: defaultCleanupPolicy,
      }).run({ actions: [action], blocked: [] }, HOME),
    );
    expect(journal.outcomes[0]?.outcome).toBe(OutcomeKind.SkippedBecauseAppOpened);
    expect(journal.outcomes[0]?.problem).toBeUndefined();
  });

  test("reports why an owner tool failed while running", async () => {
    const ownerTools = new FakeOwnerTools(new Set([OwnerToolId.SimulatorCleanup]));
    ownerTools.failRun(OwnerToolId.SimulatorCleanup, ToolProblem.TimedOut);
    const result = await runPlanWith(ownerTools);
    expect(result?.outcome).toBe(OutcomeKind.Failed);
    expect(result?.problem).toBe(ToolProblem.TimedOut);
    expect(result?.detail).toBe("tool output");
  });

  test("skips an item that was replaced after review", async () => {
    const files = fileSystemWithEverything();
    const plan = await planner(files).plan(draft, HOME);
    files.replace(pathOf("/Users/sam/Library/Caches/Google"));
    const journal = new MemoryJournal();
    await collect(
      new ExecuteCleanup({
        apps: appsRunning(),
        volumes: volumeWithAvailable(),
        files,
        trash: files,
        remover: files,
        ownerTools: new FakeOwnerTools(new Set()),
        sizeMeter: files,
        journal,
        policy: defaultCleanupPolicy,
      }).run(plan, HOME),
    );
    expect(files.removed).not.toContain("/Users/sam/Library/Caches/Google");
    expect(
      journal.outcomes.find((result) => result.outcome === OutcomeKind.SkippedBecauseChanged),
    ).toBeDefined();
  });

  test("skips an item whose app was opened after review", async () => {
    const files = fileSystemWithEverything();
    const plan = await planner(files).plan(draft, HOME);
    const journal = new MemoryJournal();
    await collect(
      new ExecuteCleanup({
        apps: appsRunning("Google Chrome"),
        volumes: volumeWithAvailable(),
        files,
        trash: files,
        remover: files,
        ownerTools: new FakeOwnerTools(new Set()),
        sizeMeter: files,
        journal,
        policy: defaultCleanupPolicy,
      }).run(plan, HOME),
    );
    expect(files.removed).not.toContain("/Users/sam/Library/Caches/Google");
    const skipped = journal.outcomes.find(
      (result) => result.outcome === OutcomeKind.SkippedBecauseAppOpened,
    );
    expect(skipped?.detail).toBe("Google Chrome");
    expect(skipped?.freed.isZero()).toBe(true);
  });

  test("never touches a path that is not in the approved plan", async () => {
    const plan = await planner(fileSystemWithEverything()).plan(draft, HOME);
    await fc.assert(
      fc.asyncProperty(fc.subarray([...plan.actions]), async (approvedSubset) => {
        const files = fileSystemWithEverything();
        const subsetPlan: CleanupPlan = { actions: approvedSubset, blocked: [] };
        await collect(
          new ExecuteCleanup({
            apps: appsRunning(),
            volumes: volumeWithAvailable(),
            files,
            trash: files,
            remover: files,
            ownerTools: new FakeOwnerTools(new Set()),
            sizeMeter: files,
            journal: new MemoryJournal(),
            policy: defaultCleanupPolicy,
          }).run(subsetPlan, HOME),
        );
        const allowed = new Set(
          approvedSubset.flatMap((action) =>
            action.kind === CleanupActionKind.RunOwnerTool ? [] : [action.path.toString()],
          ),
        );
        return [...files.removed, ...files.trashed].every((path) => allowed.has(path));
      }),
    );
  });
});
