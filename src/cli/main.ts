#!/usr/bin/env bun
import { homedir } from "node:os";
import { resolve } from "node:path";
import packageManifest from "../../package.json" with { type: "json" };
import {
  buildRuleIndex,
  DiagnoseDisk,
  DiagnosisUpdateKind,
  ExecuteCleanup,
  PlanCleanup,
  RecordScanHistory,
  type DiagnosisReport,
} from "../application/index.ts";
import {
  AbsolutePath,
  assertNever,
  defaultDiagnosisPolicy,
  defaultHistoryPolicy,
  defaultScanPolicy,
  folderScope,
  type ScanScope,
} from "../domain/index.ts";
import {
  bunCommandRunner,
  openWhyfullDatabase,
  SqliteCleanupJournal,
  SqliteSnapshotRepository,
  systemClock,
} from "../infrastructure/index.ts";
import { createPlatform, type Platform } from "../platform/index.ts";
import { renderJsonReport, renderTextReport, startTui } from "../presentation/index.ts";
import {
  CommandKind,
  parseCommand,
  ReportFormat,
  ScanTargetKind,
  type Command,
  type ScanTarget,
} from "./arguments.ts";
import { CliCopy } from "./cli-copy.ts";

const ARGUMENTS_AFTER_SCRIPT = 2;
const FAILURE_EXIT_CODE = 1;

function exitWith(message: string): never {
  console.error(message);
  process.exit(FAILURE_EXIT_CODE);
}

function scopeFor(target: ScanTarget, platform: Platform): ScanScope {
  if (target.kind === ScanTargetKind.WholeDisk) {
    return platform.wholeDiskScope ?? exitWith(CliCopy.wholeDiskUnsupported);
  }
  if (target.folder === undefined) return folderScope(platform.defaultScanRoot);
  const parsed = AbsolutePath.parse(resolve(target.folder));
  return parsed.ok ? folderScope(parsed.value) : exitWith(CliCopy.invalidFolder(target.folder));
}

async function runReport(diagnoseDisk: DiagnoseDisk, scope: ScanScope): Promise<DiagnosisReport> {
  for await (const update of diagnoseDisk.run(scope)) {
    if (update.kind === DiagnosisUpdateKind.Completed) return update.report;
    if (update.kind === DiagnosisUpdateKind.Failed) exitWith(CliCopy.scanFailed(update.reason));
  }
  return exitWith(CliCopy.scanFailed(scope.root.toString()));
}

async function run(command: Command, platform: Platform, home: AbsolutePath): Promise<void> {
  const database = openWhyfullDatabase(platform.dataDirectory);
  const scanHistory = new RecordScanHistory(
    new SqliteSnapshotRepository(database),
    defaultHistoryPolicy,
  );
  const ruleIndex = buildRuleIndex(platform.rulePacks, platform.pathContext);
  if (!ruleIndex.ok) exitWith(CliCopy.duplicateRule(ruleIndex.error.duplicateId));
  const diagnoseDisk = new DiagnoseDisk({
    scanner: platform.scanner,
    ruleIndex: ruleIndex.value,
    personalFileExtensions: platform.personalFileExtensions,
    scanPolicy: defaultScanPolicy,
    diagnosisPolicy: defaultDiagnosisPolicy,
    clock: systemClock,
  });

  switch (command.kind) {
    case CommandKind.Report: {
      const scope = scopeFor(command.target, platform);
      console.error(CliCopy.scanning(scope.root.toString()));
      const report = await runReport(diagnoseDisk, scope);
      const growth = scanHistory.recordAndCompare(report.snapshot, scope);
      console.log(
        command.format === ReportFormat.Json
          ? renderJsonReport(report, home, growth)
          : renderTextReport(report, home, growth, systemClock.now()),
      );
      return;
    }
    case CommandKind.Interactive:
      await startTui({
        context: {
          home,
          initialScope: scopeFor(command.target, platform),
          wholeDiskScope: platform.wholeDiskScope,
          systemDescription: await platform.systemInfo.describeSystem(),
          scanPolicy: defaultScanPolicy,
          diagnosisPolicy: defaultDiagnosisPolicy,
          historyPolicy: defaultHistoryPolicy,
        },
        diagnoseDisk,
        volumes: platform.volumes,
        storage: platform.storage,
        permissions: platform.permissions,
        planCleanup: new PlanCleanup({
          files: platform.files,
          apps: platform.apps,
          ownerTools: platform.ownerTools,
          protectedLocations: platform.protectedLocations,
        }),
        executeCleanup: new ExecuteCleanup({
          volumes: platform.volumes,
          files: platform.files,
          trash: platform.trash,
          remover: platform.remover,
          ownerTools: platform.ownerTools,
          journal: new SqliteCleanupJournal(database, systemClock),
        }),
        scanHistory,
        clipboard: platform.clipboard,
        clock: systemClock,
      });
      return;
    case CommandKind.Help:
      console.log(CliCopy.usage);
      return;
    case CommandKind.Version:
      console.log(packageManifest.version);
      return;
    default:
      assertNever(command);
  }
}

async function main(): Promise<void> {
  const command = parseCommand(process.argv.slice(ARGUMENTS_AFTER_SCRIPT));
  if (!command.ok) exitWith(CliCopy.unknownCommand(command.error.detail));

  const home = AbsolutePath.parse(homedir());
  if (!home.ok) exitWith(CliCopy.homeUnavailable);

  const platform = createPlatform(process.platform, {
    home: home.value,
    clock: systemClock,
    commands: bunCommandRunner,
  });
  if (!platform.ok) exitWith(CliCopy.unsupportedPlatform(platform.error.operatingSystem));

  await run(command.value, platform.value, home.value);
}

await main();
