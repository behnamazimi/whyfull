import { assertNever } from "../domain/index.ts";
import { ArgumentProblemKind, type ArgumentProblem } from "./arguments.ts";

const SEE_HELP = "Run whyfull --help to see what it can do.";

export const CliCopy = {
  usage: [
    "whyfull — find out why your disk is full",
    "",
    "Usage:",
    "  whyfull [folder]                 Open the interactive view (default: your home folder)",
    "  whyfull --whole-disk             Open it for the whole disk instead of one folder",
    "  whyfull report [folder]          Print a summary and exit",
    "  whyfull report --whole-disk      Print a summary of the whole disk",
    "  whyfull report [folder] --json   Print the summary as JSON",
    "",
    "Options:",
    "  -h, --help      Show this help",
    "  -v, --version   Show the version",
    "",
    "whyfull exits with 0 when it worked and 1 when something went wrong.",
  ].join("\n"),
  scanning: (folder: string) => `Scanning ${folder}…`,
  unsupportedPlatform: (system: string) =>
    `whyfull does not support ${system} yet. It currently runs on macOS.`,
  invalidFolder: (folder: string) => `"${folder}" is not a folder path whyfull can scan.`,
  folderMissing: (folder: string) => `There is no folder at "${folder}".`,
  notAFolder: (folder: string) =>
    `"${folder}" is a file, not a folder. Give the folder that holds it.`,
  needsTerminal: "whyfull needs a terminal window. To print a summary instead, run: whyfull report",
  homeUnavailable: "Couldn't find your home folder.",
  duplicateRule: (ruleId: string) => `Internal error: rule "${ruleId}" is defined twice.`,
  historySetAside: (path: string) =>
    `Your saved history came from a different version of whyfull, so it was moved to ${path} and a new one was started.`,
  scanFailed: (reason: string) => `The scan failed: ${reason}`,
  wholeDiskUnsupported: "Scanning the whole disk is not supported on this system yet.",
  argumentProblem(problem: ArgumentProblem): string {
    switch (problem.kind) {
      case ArgumentProblemKind.UnknownOption:
        return `Unknown option "${problem.option}". ${SEE_HELP}`;
      case ArgumentProblemKind.OptionTakesNoValue:
        return `"${problem.option}" doesn't take a value. ${SEE_HELP}`;
      case ArgumentProblemKind.ExtraArgument:
        return `Didn't expect "${problem.argument}": whyfull looks at one folder at a time. ${SEE_HELP}`;
      case ArgumentProblemKind.JsonNeedsReport:
        return "--json works only with report, as in: whyfull report --json";
      case ArgumentProblemKind.FolderAndWholeDisk:
        return "Choose a folder or --whole-disk, not both.";
      default:
        return assertNever(problem);
    }
  },
} as const;
