import { Duration } from "../../domain/index.ts";

const QUICK_COMMAND_SECONDS = 5;
const DISK_COMMAND_SECONDS = 20;

export const QUICK_COMMAND_TIMEOUT = Duration.ofSeconds(QUICK_COMMAND_SECONDS);
export const DISK_COMMAND_TIMEOUT = Duration.ofSeconds(DISK_COMMAND_SECONDS);

const FULL_DISK_ACCESS_SETTINGS_URL =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles";

export const MacCommand = {
  copyToClipboard: { executable: "pbcopy", arguments: [] },
  productName: { executable: "sw_vers", arguments: ["-productName"] },
  productVersion: { executable: "sw_vers", arguments: ["-productVersion"] },
  plistToJson: { executable: "plutil", arguments: ["-convert", "json", "-o", "-", "-"] },
  openFullDiskAccessSettings: { executable: "open", arguments: [FULL_DISK_ACCESS_SETTINGS_URL] },
  listLocalSnapshots: { executable: "tmutil", arguments: ["listlocalsnapshots", "/"] },
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
