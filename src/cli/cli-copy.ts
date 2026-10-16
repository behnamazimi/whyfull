export const CliCopy = {
  usage: [
    "whyfull — find out why your disk is full",
    "",
    "Usage:",
    "  whyfull [folder]              Open the interactive view (default: your home folder)",
    "  whyfull report [folder]       Print a summary and exit",
    "  whyfull report [folder] --json  Print the summary as JSON",
    "  whyfull --whole-disk          Look through the whole disk instead of one folder",
    "",
    "Options:",
    "  -h, --help      Show this help",
    "  -v, --version   Show the version",
  ].join("\n"),
  scanning: (folder: string) => `Scanning ${folder}…`,
  unsupportedPlatform: (system: string) =>
    `whyfull does not support ${system} yet. It currently runs on macOS.`,
  invalidFolder: (folder: string) => `"${folder}" is not a folder path whyfull can scan.`,
  homeUnavailable: "Couldn't find your home folder.",
  duplicateRule: (ruleId: string) => `Internal error: rule "${ruleId}" is defined twice.`,
  historySetAside: (path: string) =>
    `Your saved history came from a different version of whyfull, so it was moved to ${path} and a new one was started.`,
  scanFailed: (reason: string) => `The scan failed: ${reason}`,
  wholeDiskUnsupported: "Scanning the whole disk is not supported on this system yet.",
  unknownCommand: (command: string) => `Unknown command "${command}". Run whyfull --help.`,
} as const;
