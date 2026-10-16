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
} from "../../src/application/index.ts";
import {
  ByteSize,
  defaultDiagnosisPolicy,
  defaultScanPolicy,
  draftCleanup,
  folderScope,
  OutcomeKind,
  RuleId,
} from "../../src/domain/index.ts";
import {
  bunCommandRunner,
  openInMemoryDatabase,
  SqliteCleanupJournal,
  systemClock,
} from "../../src/infrastructure/index.ts";
import { createMacOsPlatform } from "../../src/platform/index.ts";
import { pathOf } from "../support/domain-builders.ts";
import { appsRunning, FakeOwnerTools } from "../support/fake-cleanup-ports.ts";

describe("cleanup on a real folder", () => {
  let home: string;

  beforeAll(async () => {
    home = await mkdtemp(join(tmpdir(), "whyfull-cleanup-"));
    await mkdir(join(home, "app", "node_modules", "left-pad"), { recursive: true });
    await writeFile(join(home, "app", "package.json"), "{}");
    await writeFile(join(home, "app", "index.js"), "export {};");
    await writeFile(join(home, "app", "node_modules", "left-pad", "index.js"), "export {};");
  });

  afterAll(async () => {
    await rm(home, { recursive: true, force: true });
  });

  test("removes only the approved regenerable folder", async () => {
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
    const entries = report.classification.classifications
      .filter((item) => item.rule.id === RuleId.NodeModules)
      .map((item) => ({ path: item.path, rule: item.rule, size: item.size }));
    const draft = draftCleanup({
      entries,
      root: report.snapshot.root,
      classification: report.classification,
    });
    const ownerTools = new FakeOwnerTools(new Set());
    const plan = await new PlanCleanup({
      files: platform.files,
      apps: appsRunning(),
      ownerTools,
      protectedLocations: platform.protectedLocations,
    }).plan(draft, pathOf(home));

    const outcomes = [];
    for await (const event of new ExecuteCleanup({
      volumes: platform.volumes,
      files: platform.files,
      trash: platform.trash,
      remover: platform.remover,
      ownerTools,
      journal: new SqliteCleanupJournal(openInMemoryDatabase(), systemClock),
    }).run(plan, pathOf(home))) {
      if (event.kind === CleanupEventKind.ActionFinished) outcomes.push(event.result.outcome);
    }

    expect(outcomes).toEqual([OutcomeKind.Done]);
    expect((await readdir(join(home, "app"))).sort()).toEqual(["index.js", "package.json"]);
  });
});
