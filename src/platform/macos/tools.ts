import { Duration, OwnerToolId } from "../../domain/index.ts";

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
  runningAppNames: { executable: "ps", arguments: ["-axco", "comm="] },
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

export interface ToolCommand {
  readonly executable: string;
  readonly arguments: readonly string[];
}

export const ownerToolCommands: Readonly<Record<OwnerToolId, ToolCommand>> = {
  [OwnerToolId.DockerPrune]: { executable: "docker", arguments: ["system", "prune", "--force"] },
  [OwnerToolId.HomebrewCleanup]: { executable: "brew", arguments: ["cleanup", "--prune=all"] },
  [OwnerToolId.SimulatorCleanup]: {
    executable: "xcrun",
    arguments: ["simctl", "delete", "unavailable"],
  },
  [OwnerToolId.NpmCacheClean]: { executable: "npm", arguments: ["cache", "clean", "--force"] },
  [OwnerToolId.PnpmStorePrune]: { executable: "pnpm", arguments: ["store", "prune"] },
  [OwnerToolId.BunCacheClean]: { executable: "bun", arguments: ["pm", "cache", "rm"] },
};
