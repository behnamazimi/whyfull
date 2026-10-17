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
  defaultCleanupPolicy,
  defaultDiagnosisPolicy,
  defaultScanPolicy,
  draftCleanup,
  folderScope,
  type CartEntry,
  type OutcomeKind,
} from "../../src/domain/index.ts";
import {
  bunCommandRunner,
  openInMemoryDatabase,
  SqliteCleanupJournal,
  systemClock,
} from "../../src/infrastructure/index.ts";
import { createMacOsPlatform, type Platform } from "../../src/platform/index.ts";
import { pathOf } from "./domain-builders.ts";
import { appsRunning, FakeOwnerTools } from "./fake-cleanup-ports.ts";

export async function scanned(
  home: string,
): Promise<{ platform: Platform; report: DiagnosisReport }> {
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

export async function cleanUp(
  platform: Platform,
  report: DiagnosisReport,
  entries: readonly CartEntry[],
  home: string,
  database = openInMemoryDatabase(),
  runningApps: readonly string[] = [],
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
    apps: appsRunning(...runningApps),
    ownerTools,
    protectedLocations: platform.protectedLocations,
  }).plan(draft, pathOf(home));

  const outcomes: OutcomeKind[] = [];
  for await (const event of new ExecuteCleanup({
    apps: appsRunning(...runningApps),
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
