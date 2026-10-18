import { Duration, OwnerToolId, ProbeProblem } from "../../domain/index.ts";

const QUICK_COMMAND_SECONDS = 5;
const DISK_COMMAND_SECONDS = 20;
const TRASH_COMMAND_SECONDS = 120;
const OWNER_TOOL_SECONDS = 600;

export const QUICK_COMMAND_TIMEOUT = Duration.ofSeconds(QUICK_COMMAND_SECONDS);
export const DISK_COMMAND_TIMEOUT = Duration.ofSeconds(DISK_COMMAND_SECONDS);
export const TRASH_COMMAND_TIMEOUT = Duration.ofSeconds(TRASH_COMMAND_SECONDS);
export const OWNER_TOOL_TIMEOUT = Duration.ofSeconds(OWNER_TOOL_SECONDS);

const FULL_DISK_ACCESS_SETTINGS_URL =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles";

// macOS ships these, so call them by full path: a same-named tool earlier on PATH (Homebrew has a
// different `trash`) must never receive a cleanup command meant for Apple's.
export const SystemTool = {
  pbcopy: "/usr/bin/pbcopy",
  swVers: "/usr/bin/sw_vers",
  plutil: "/usr/bin/plutil",
  open: "/usr/bin/open",
  tmutil: "/usr/bin/tmutil",
  ps: "/bin/ps",
  osascript: "/usr/bin/osascript",
  trash: "/usr/bin/trash",
  df: "/bin/df",
  diskutil: "/usr/sbin/diskutil",
  xcodeSelect: "/usr/bin/xcode-select",
  xcrun: "/usr/bin/xcrun",
} as const;

export const MacCommand = {
  copyToClipboard: { executable: SystemTool.pbcopy, arguments: [] },
  productName: { executable: SystemTool.swVers, arguments: ["-productName"] },
  productVersion: { executable: SystemTool.swVers, arguments: ["-productVersion"] },
  plistToJson: { executable: SystemTool.plutil, arguments: ["-convert", "json", "-o", "-", "-"] },
  openFullDiskAccessSettings: {
    executable: SystemTool.open,
    arguments: [FULL_DISK_ACCESS_SETTINGS_URL],
  },
  listLocalSnapshots: { executable: SystemTool.tmutil, arguments: ["listlocalsnapshots", "/"] },
  // Only this user's processes count: another account's open app can't be using these files.
  runningAppNames: (userId: number | undefined) => ({
    executable: SystemTool.ps,
    arguments:
      userId === undefined ? ["-axco", "comm="] : ["-x", "-U", String(userId), "-co", "comm="],
  }),
  revealInFinder: (path: string) => ({ executable: SystemTool.open, arguments: ["-R", path] }),
  // Finder empties the Trash the way the person would, and needs no Full Disk Access.
  emptyTrash: {
    executable: SystemTool.osascript,
    arguments: ["-e", 'tell application "Finder" to empty trash'],
  },
  moveToTrash: (path: string) => ({ executable: SystemTool.trash, arguments: ["-s", path] }),
  mountPointOf: (path: string) => ({ executable: SystemTool.df, arguments: ["-P", path] }),
  volumeInfo: (mountPoint: string) => ({
    executable: SystemTool.diskutil,
    arguments: ["info", "-plist", mountPoint],
  }),
  apfsContainer: (container: string) => ({
    executable: SystemTool.diskutil,
    arguments: ["apfs", "list", "-plist", container],
  }),
} as const;

export const LOCAL_SNAPSHOT_PREFIX = "com.apple.TimeMachine.";

export interface CommandSpec {
  readonly executable: string;
  readonly arguments: readonly string[];
}

/** A cheap command that must succeed before the tool is trusted to run. */
export interface ToolProbe {
  readonly command: CommandSpec;
  readonly onNonZeroExit: ProbeProblem;
  /** When set, the command's output must equal `output`, or the tool is set up for something else. */
  readonly expect?: { readonly output: string; readonly otherwise: ProbeProblem };
}

export interface ToolCommand extends CommandSpec {
  readonly probes: readonly ToolProbe[];
}

// What `docker info` reports as the operating system when Docker Desktop is the engine.
export const DOCKER_DESKTOP_ENGINE_NAME = "Docker Desktop";

export const ownerToolCommands: Readonly<Record<OwnerToolId, ToolCommand>> = {
  [OwnerToolId.DockerPrune]: {
    executable: "docker",
    arguments: ["system", "prune", "--force"],
    probes: [
      {
        command: { executable: "docker", arguments: ["info", "--format", "{{.OperatingSystem}}"] },
        onNonZeroExit: ProbeProblem.NotRunning,
        expect: { output: DOCKER_DESKTOP_ENGINE_NAME, otherwise: ProbeProblem.WrongEngine },
      },
    ],
  },
  [OwnerToolId.SimulatorCleanup]: {
    executable: SystemTool.xcrun,
    arguments: ["simctl", "delete", "unavailable"],
    // xcrun exists without full Xcode, and asking it with no developer folder at all opens an install dialog.
    probes: [
      {
        command: { executable: SystemTool.xcodeSelect, arguments: ["-p"] },
        onNonZeroExit: ProbeProblem.Unusable,
      },
      {
        command: { executable: SystemTool.xcrun, arguments: ["--find", "simctl"] },
        onNonZeroExit: ProbeProblem.Unusable,
      },
    ],
  },
};
