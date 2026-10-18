#!/usr/bin/env bun
import { statSync } from "node:fs";
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
  defaultCleanupPolicy,
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
  if (!parsed.ok) return exitWith(CliCopy.invalidFolder(target.folder));
  const kind = entryKindAt(parsed.value.toString());
  if (kind === EntryKind.Missing) return exitWith(CliCopy.folderMissing(target.folder));
  if (kind === EntryKind.NotAFolder) return exitWith(CliCopy.notAFolder(target.folder));
  return folderScope(parsed.value);
}

const EntryKind = {
  Folder: "folder",
  NotAFolder: "not-a-folder",
  Missing: "missing",
} as const;
type EntryKind = (typeof EntryKind)[keyof typeof EntryKind];

function entryKindAt(path: string): EntryKind {
  try {
    const stats = statSync(path, { throwIfNoEntry: false });
    if (stats === undefined) return EntryKind.Missing;
    return stats.isDirectory() ? EntryKind.Folder : EntryKind.NotAFolder;
  } catch {
    // A file in the middle of the path, or a folder whyfull may not open, reads as no folder there.
    return EntryKind.Missing;
  }
}

async function runReport(diagnoseDisk: DiagnoseDisk, scope: ScanScope): Promise<DiagnosisReport> {
  for await (const update of diagnoseDisk.run(scope)) {
    if (update.kind === DiagnosisUpdateKind.Completed) return update.report;
    if (update.kind === DiagnosisUpdateKind.Failed) exitWith(CliCopy.scanFailed(update.reason));
  }
  return exitWith(CliCopy.scanFailed(scope.root.toString()));
}

type ScanCommand = Extract<Command, { readonly target: ScanTarget }>;

async function run(command: ScanCommand, platform: Platform, home: AbsolutePath): Promise<void> {
  const { database, setAside } = openWhyfullDatabase(platform.dataDirectory, systemClock.now());
  if (setAside !== undefined) console.error(CliCopy.historySetAside(setAside.toString()));
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

  const cleanupJournal = new SqliteCleanupJournal(database, systemClock);

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
          cleanupPolicy: defaultCleanupPolicy,
          highRiskLimits: platform.highRiskLimits,
          protectedLocations: platform.protectedLocations,
          knownFolders: platform.knownFolders,
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
          apps: platform.apps,
          volumes: platform.volumes,
          files: platform.files,
          trash: platform.trash,
          remover: platform.remover,
          ownerTools: platform.ownerTools,
          sizeMeter: platform.sizeMeter,
          journal: cleanupJournal,
          policy: defaultCleanupPolicy,
        }),
        cleanupJournal,
        scanHistory,
        clipboard: platform.clipboard,
        opener: platform.opener,
        apps: platform.apps,
        clock: systemClock,
        historySetAside: setAside !== undefined,
      });
      return;
    default:
      assertNever(command);
  }
}

async function main(): Promise<void> {
  const command = parseCommand(process.argv.slice(ARGUMENTS_AFTER_SCRIPT));
  if (!command.ok) exitWith(CliCopy.argumentProblem(command.error));
  // Help and the version need nothing else, so they run before the history database is opened.
  if (command.value.kind === CommandKind.Help) {
    console.log(CliCopy.usage);
    return;
  }
  if (command.value.kind === CommandKind.Version) {
    console.log(packageManifest.version);
    return;
  }
  // The interactive view draws on a terminal and waits for keys; without one it would hang.
  if (
    command.value.kind === CommandKind.Interactive &&
    (!process.stdin.isTTY || !process.stdout.isTTY)
  ) {
    exitWith(CliCopy.needsTerminal);
  }

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
