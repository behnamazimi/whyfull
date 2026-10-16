import { Duration } from "../../domain/index.ts";

const QUICK_COMMAND_SECONDS = 5;

export const QUICK_COMMAND_TIMEOUT = Duration.ofSeconds(QUICK_COMMAND_SECONDS);

export const MacCommand = {
  copyToClipboard: { executable: "pbcopy", arguments: [] },
  productName: { executable: "sw_vers", arguments: ["-productName"] },
  productVersion: { executable: "sw_vers", arguments: ["-productVersion"] },
} as const;
