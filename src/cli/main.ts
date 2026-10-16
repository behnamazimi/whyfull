#!/usr/bin/env bun
import { homedir } from "node:os";
import { resolve } from "node:path";
import packageManifest from "../../package.json" with { type: "json" };
import {
  buildRuleIndex,
  DiagnoseDisk,
  DiagnosisUpdateKind,
  type DiagnosisReport,
} from "../application/index.ts";
import {
  AbsolutePath,
  assertNever,
  defaultDiagnosisPolicy,
  defaultScanPolicy,
} from "../domain/index.ts";
import { bunCommandRunner, systemClock } from "../infrastructure/index.ts";
import { createPlatform, type Platform } from "../platform/index.ts";
import { renderJsonReport, renderTextReport, startTui } from "../presentation/index.ts";
import { CommandKind, parseCommand, ReportFormat, type Command } from "./arguments.ts";
import { CliCopy } from "./cli-copy.ts";

const ARGUMENTS_AFTER_SCRIPT = 2;
const FAILURE_EXIT_CODE = 1;

function exitWith(message: string): never {
  console.error(message);
  process.exit(FAILURE_EXIT_CODE);
}

function absoluteFolder(raw: string | undefined, fallback: AbsolutePath): AbsolutePath {
  if (raw === undefined) return fallback;
  const parsed = AbsolutePath.parse(resolve(raw));
  return parsed.ok ? parsed.value : exitWith(CliCopy.invalidFolder(raw));
}

async function runReport(
  diagnoseDisk: DiagnoseDisk,
  folder: AbsolutePath,
): Promise<DiagnosisReport> {
  for await (const update of diagnoseDisk.run(folder)) {
    if (update.kind === DiagnosisUpdateKind.Completed) return update.report;
    if (update.kind === DiagnosisUpdateKind.Failed) exitWith(CliCopy.scanFailed(update.reason));
  }
  return exitWith(CliCopy.scanFailed(folder.toString()));
}

async function run(command: Command, platform: Platform, home: AbsolutePath): Promise<void> {
  const ruleIndex = buildRuleIndex(platform.rulePacks, platform.pathContext);
  if (!ruleIndex.ok) exitWith(CliCopy.duplicateRule(ruleIndex.error.duplicateId));
  const diagnoseDisk = new DiagnoseDisk({
    scanner: platform.scanner,
    ruleIndex: ruleIndex.value,
    scanPolicy: defaultScanPolicy,
    diagnosisPolicy: defaultDiagnosisPolicy,
    clock: systemClock,
  });

  switch (command.kind) {
    case CommandKind.Report: {
      const folder = absoluteFolder(command.folder, platform.defaultScanRoot);
      console.error(CliCopy.scanning(folder.toString()));
      const report = await runReport(diagnoseDisk, folder);
      console.log(
        command.format === ReportFormat.Json
          ? renderJsonReport(report, home)
          : renderTextReport(report, home),
      );
      return;
    }
    case CommandKind.Interactive:
      await startTui({
        context: {
          home,
          scanRoot: absoluteFolder(command.folder, platform.defaultScanRoot),
          systemDescription: await platform.systemInfo.describeSystem(),
          scanPolicy: defaultScanPolicy,
          diagnosisPolicy: defaultDiagnosisPolicy,
        },
        diagnoseDisk,
        volumes: platform.volumes,
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
