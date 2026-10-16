import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildRuleIndex,
  CleanupEventKind,
  DiagnoseDisk,
  DiagnosisUpdateKind,
  ExecuteCleanup,
  PlanCleanup,
  type DiagnosisReport,
} from "../../src/application/index.ts";
import {
  ByteSize,
  CartEntryKind,
  defaultCleanupPolicy,
  defaultDiagnosisPolicy,
  defaultScanPolicy,
  draftCleanup,
  folderScope,
  OutcomeKind,
  RuleId,
  type CartEntry,
  type HighRiskEntry,
} from "../../src/domain/index.ts";
import {
  bunCommandRunner,
  openInMemoryDatabase,
  SqliteCleanupJournal,
  systemClock,
} from "../../src/infrastructure/index.ts";
import { createMacOsPlatform, type Platform } from "../../src/platform/index.ts";
import { pathOf } from "../support/domain-builders.ts";
import { appsRunning, FakeOwnerTools } from "../support/fake-cleanup-ports.ts";

const OLD_STUFF = "old-stuff";

describe("cleanup on a real folder", () => {
  let home: string;

  beforeAll(async () => {
    home = await mkdtemp(join(tmpdir(), "whyfull-cleanup-"));
    await mkdir(join(home, "app", "node_modules", "left-pad"), { recursive: true });
    await writeFile(join(home, "app", "package.json"), "{}");
    await writeFile(join(home, "app", "index.js"), "export {};");
    await writeFile(join(home, "app", "node_modules", "left-pad", "index.js"), "export {};");
    await mkdir(join(home, OLD_STUFF, "nested"), { recursive: true });
    await writeFile(join(home, OLD_STUFF, "nested", "data.bin"), "old");
  });

  afterAll(async () => {
    await rm(home, { recursive: true, force: true });
  });

  test("removes only the approved regenerable folder", async () => {
    const { platform, report } = await scanned(home);
    const entries = report.classification.classifications
      .filter((item) => item.rule.id === RuleId.NodeModules)
      .map((item) => ({
        kind: CartEntryKind.Recognized,
        path: item.path,
        rule: item.rule,
        size: item.size,
      }));
    const outcomes = await cleanUp(platform, report, entries, home);

    expect(outcomes).toEqual([OutcomeKind.Done]);
    expect((await readdir(join(home, "app"))).sort()).toEqual(["index.js", "package.json"]);
  });

  test("deletes a high-risk folder for good and journals it", async () => {
    const { platform, report } = await scanned(home);
    const folder = report.snapshot.root.find(pathOf(join(home, OLD_STUFF)));
    if (folder === undefined) throw new Error("old-stuff was not scanned");
    const entry: HighRiskEntry = {
      kind: CartEntryKind.HighRisk,
      path: folder.path,
      size: folder.totalSize,
      fileCount: folder.fileCount,
      personalFileCount: folder.personalFileCount,
      lastModified: folder.lastModified,
      scannedIdentity: folder.identity,
      rule: undefined,
    };
    const database = openInMemoryDatabase();
    const outcomes = await cleanUp(platform, report, [entry], home, database);

    expect(outcomes).toEqual([OutcomeKind.Done]);
    expect(await readdir(home)).not.toContain(OLD_STUFF);
    expect(database.query("SELECT high_risk, file_count FROM cleanup_journal").get()).toEqual({
      high_risk: 1,
      file_count: 1,
    });
  });
});

async function scanned(home: string) {
  const platform = createMacOsPlatform({
    home: pathOf(home),
    clock: systemClock,
    commands: bunCommandRunner,
  });
  const index = buildRuleIndex(platform.rulePacks, platform.pathContext);
  if (!index.ok) throw new Error("rules must build");
  const diagnose = new DiagnoseDisk({
    scanner: platform.scanner,
    ruleIndex: index.value,
    personalFileExtensions: platform.personalFileExtensions,
    scanPolicy: defaultScanPolicy,
    diagnosisPolicy: { ...defaultDiagnosisPolicy, minimumFindingSize: ByteSize.zero },
    clock: systemClock,
  });
  let report;
  for await (const update of diagnose.run(folderScope(pathOf(home)))) {
    if (update.kind === DiagnosisUpdateKind.Completed) report = update.report;
  }
  if (report === undefined) throw new Error("scan did not complete");
  return { platform, report };
}

async function cleanUp(
  platform: Platform,
  report: DiagnosisReport,
  entries: readonly CartEntry[],
  home: string,
  database = openInMemoryDatabase(),
): Promise<OutcomeKind[]> {
  const draft = draftCleanup({
    entries,
    root: report.snapshot.root,
    classification: report.classification,
    highRiskLimits: platform.highRiskLimits,
    protectedLocations: platform.protectedLocations,
  });
  const ownerTools = new FakeOwnerTools(new Set());
  const plan = await new PlanCleanup({
    files: platform.files,
    apps: appsRunning(),
    ownerTools,
    protectedLocations: platform.protectedLocations,
  }).plan(draft, pathOf(home));

  const outcomes: OutcomeKind[] = [];
  for await (const event of new ExecuteCleanup({
    volumes: platform.volumes,
    files: platform.files,
    trash: platform.trash,
    remover: platform.remover,
    ownerTools,
    sizeMeter: platform.sizeMeter,
    journal: new SqliteCleanupJournal(database, systemClock),
    policy: defaultCleanupPolicy,
  }).run(plan, pathOf(home))) {
    if (event.kind === CleanupEventKind.ActionFinished) outcomes.push(event.result.outcome);
  }
  return outcomes;
}
