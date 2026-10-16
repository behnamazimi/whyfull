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
const WHOLE_DISK_OPTION = "whole-disk";

export const ScanTargetKind = {
  Folder: "folder",
  WholeDisk: "whole-disk",
} as const;
export type ScanTargetKind = (typeof ScanTargetKind)[keyof typeof ScanTargetKind];

export type ScanTarget =
  | { readonly kind: typeof ScanTargetKind.Folder; readonly folder: string | undefined }
  | { readonly kind: typeof ScanTargetKind.WholeDisk };

export interface UnknownArguments {
  readonly detail: string;
}

const parseOptions = (argv: readonly string[]) =>
  parseArgs({
    args: [...argv],
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      json: { type: "boolean" },
      [WHOLE_DISK_OPTION]: { type: "boolean" },
    },
  });

export function parseCommand(argv: readonly string[]): Result<Command, UnknownArguments> {
  let parsed: ReturnType<typeof parseOptions>;
  try {
    parsed = parseOptions(argv);
  } catch (error) {
    return failure({ detail: String(error) });
  }
  const { values, positionals } = parsed;
  if (values.help === true) return success({ kind: CommandKind.Help });
  if (values.version === true) return success({ kind: CommandKind.Version });
  const [first, second] = positionals;
  const isReport = first === REPORT_SUBCOMMAND;
  const folder = isReport ? second : first;
  const target: ScanTarget =
    values[WHOLE_DISK_OPTION] === true
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
