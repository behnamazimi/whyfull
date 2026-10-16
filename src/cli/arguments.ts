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
  | { readonly kind: typeof CommandKind.Interactive; readonly folder: string | undefined }
  | {
      readonly kind: typeof CommandKind.Report;
      readonly folder: string | undefined;
      readonly format: ReportFormat;
    }
  | { readonly kind: typeof CommandKind.Help }
  | { readonly kind: typeof CommandKind.Version };

const REPORT_SUBCOMMAND = "report";

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
  if (first === REPORT_SUBCOMMAND) {
    return success({
      kind: CommandKind.Report,
      folder: second,
      format: values.json === true ? ReportFormat.Json : ReportFormat.Text,
    });
  }
  return success({ kind: CommandKind.Interactive, folder: first });
}
