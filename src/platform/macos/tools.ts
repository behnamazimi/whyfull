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

export const MacCommand = {
  copyToClipboard: { executable: "pbcopy", arguments: [] },
  productName: { executable: "sw_vers", arguments: ["-productName"] },
  productVersion: { executable: "sw_vers", arguments: ["-productVersion"] },
  plistToJson: { executable: "plutil", arguments: ["-convert", "json", "-o", "-", "-"] },
  openFullDiskAccessSettings: { executable: "open", arguments: [FULL_DISK_ACCESS_SETTINGS_URL] },
  listLocalSnapshots: { executable: "tmutil", arguments: ["listlocalsnapshots", "/"] },
  // Only this user's processes count: another account's open app can't be using these files.
  runningAppNames: (userId: number | undefined) => ({
    executable: "ps",
    arguments:
      userId === undefined ? ["-axco", "comm="] : ["-x", "-U", String(userId), "-co", "comm="],
  }),
  moveToTrash: (path: string) => ({ executable: "trash", arguments: ["-s", path] }),
  mountPointOf: (path: string) => ({ executable: "df", arguments: ["-P", path] }),
  volumeInfo: (mountPoint: string) => ({
    executable: "diskutil",
    arguments: ["info", "-plist", mountPoint],
  }),
  apfsContainer: (container: string) => ({
    executable: "diskutil",
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
    arguments: ["system", "prune", "--all", "--force"],
    probes: [
      {
        command: { executable: "docker", arguments: ["info", "--format", "{{.OperatingSystem}}"] },
        onNonZeroExit: ProbeProblem.NotRunning,
        expect: { output: DOCKER_DESKTOP_ENGINE_NAME, otherwise: ProbeProblem.WrongEngine },
      },
    ],
  },
  [OwnerToolId.SimulatorCleanup]: {
    executable: "xcrun",
    arguments: ["simctl", "delete", "unavailable"],
    // xcrun exists without full Xcode, and asking it with no developer folder at all opens an install dialog.
    probes: [
      {
        command: { executable: "xcode-select", arguments: ["-p"] },
        onNonZeroExit: ProbeProblem.Unusable,
      },
      {
        command: { executable: "xcrun", arguments: ["--find", "simctl"] },
        onNonZeroExit: ProbeProblem.Unusable,
      },
    ],
  },
};
