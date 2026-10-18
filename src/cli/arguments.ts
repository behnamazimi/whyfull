import { parseArgs } from "node:util";
import { failure, success, type Result } from "../domain/index.ts";

export const CommandKind = {
  Interactive: "interactive",
  Report: "report",
  Help: "help",
  Version: "version",
} as const;
export type CommandKind = (typeof CommandKind)[keyof typeof CommandKind];

export const ReportFormat = {
  Text: "text",
  Json: "json",
} as const;
export type ReportFormat = (typeof ReportFormat)[keyof typeof ReportFormat];

export type Command =
  | {
      readonly kind: typeof CommandKind.Interactive;
      readonly target: ScanTarget;
    }
  | {
      readonly kind: typeof CommandKind.Report;
      readonly target: ScanTarget;
      readonly format: ReportFormat;
    }
  | { readonly kind: typeof CommandKind.Help }
  | { readonly kind: typeof CommandKind.Version };

const REPORT_SUBCOMMAND = "report";
const HELP_SUBCOMMAND = "help";
const VERSION_SUBCOMMAND = "version";
const WHOLE_DISK_OPTION = "whole-disk";

export const ScanTargetKind = {
  Folder: "folder",
  WholeDisk: "whole-disk",
} as const;
export type ScanTargetKind = (typeof ScanTargetKind)[keyof typeof ScanTargetKind];

export type ScanTarget =
  | { readonly kind: typeof ScanTargetKind.Folder; readonly folder: string | undefined }
  | { readonly kind: typeof ScanTargetKind.WholeDisk };

export const ArgumentProblemKind = {
  UnknownOption: "unknown-option",
  OptionTakesNoValue: "option-takes-no-value",
  ExtraArgument: "extra-argument",
  JsonNeedsReport: "json-needs-report",
  FolderAndWholeDisk: "folder-and-whole-disk",
} as const;
export type ArgumentProblemKind = (typeof ArgumentProblemKind)[keyof typeof ArgumentProblemKind];

export type ArgumentProblem =
  | {
      readonly kind:
        typeof ArgumentProblemKind.UnknownOption | typeof ArgumentProblemKind.OptionTakesNoValue;
      readonly option: string;
    }
  | { readonly kind: typeof ArgumentProblemKind.ExtraArgument; readonly argument: string }
  | {
      readonly kind:
        typeof ArgumentProblemKind.JsonNeedsReport | typeof ArgumentProblemKind.FolderAndWholeDisk;
    };

const options = {
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" },
  json: { type: "boolean" },
  [WHOLE_DISK_OPTION]: { type: "boolean" },
} as const;

const knownOptions: ReadonlySet<string> = new Set(Object.keys(options));

// Lenient parsing hands back unknown options as tokens, so they become a problem to explain, not a crash.
const parseOptions = (argv: readonly string[]) =>
  parseArgs({ args: [...argv], allowPositionals: true, strict: false, tokens: true, options });

function optionProblem(
  tokens: ReturnType<typeof parseOptions>["tokens"],
): ArgumentProblem | undefined {
  for (const token of tokens) {
    if (token.kind !== "option") continue;
    if (!knownOptions.has(token.name)) {
      return { kind: ArgumentProblemKind.UnknownOption, option: token.rawName };
    }
    if (token.value !== undefined) {
      return { kind: ArgumentProblemKind.OptionTakesNoValue, option: token.rawName };
    }
  }
  return undefined;
}

const extra = (argument: string): Result<never, ArgumentProblem> =>
  failure({ kind: ArgumentProblemKind.ExtraArgument, argument });

export function parseCommand(argv: readonly string[]): Result<Command, ArgumentProblem> {
  const { values, positionals, tokens } = parseOptions(argv);
  const problem = optionProblem(tokens);
  if (problem !== undefined) return failure(problem);
  if (values.help === true) return success({ kind: CommandKind.Help });
  if (values.version === true) return success({ kind: CommandKind.Version });

  const [first, ...rest] = positionals;
  if (first === HELP_SUBCOMMAND || first === VERSION_SUBCOMMAND) {
    const [unexpected] = rest;
    if (unexpected !== undefined) return extra(unexpected);
    return success({ kind: first === HELP_SUBCOMMAND ? CommandKind.Help : CommandKind.Version });
  }

  const isReport = first === REPORT_SUBCOMMAND;
  const [folder, unexpected] = isReport ? rest : positionals;
  if (unexpected !== undefined) return extra(unexpected);
  if (values.json === true && !isReport) {
    return failure({ kind: ArgumentProblemKind.JsonNeedsReport });
  }
  const wholeDisk = values[WHOLE_DISK_OPTION] === true;
  if (wholeDisk && folder !== undefined) {
    return failure({ kind: ArgumentProblemKind.FolderAndWholeDisk });
  }
  const target: ScanTarget = wholeDisk
    ? { kind: ScanTargetKind.WholeDisk }
    : { kind: ScanTargetKind.Folder, folder };
  if (isReport) {
    return success({
      kind: CommandKind.Report,
      target,
      format: values.json === true ? ReportFormat.Json : ReportFormat.Text,
    });
  }
  return success({ kind: CommandKind.Interactive, target });
}
