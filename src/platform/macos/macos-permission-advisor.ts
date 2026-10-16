import { readdir } from "node:fs/promises";
import {
  AccessState,
  type CommandRunner,
  type PermissionAdvisor,
} from "../../application/index.ts";
import { failure, ScanIssueKind, success, type PathContext } from "../../domain/index.ts";
import { scanIssueKindFor } from "../posix/file-system-errors.ts";
import { MacPaths } from "./paths.ts";
import { MacCommand, QUICK_COMMAND_TIMEOUT } from "./tools.ts";

async function accessTo(path: string): Promise<AccessState> {
  try {
    await readdir(path);
    return AccessState.Granted;
  } catch (error) {
    return scanIssueKindFor(error) === ScanIssueKind.PermissionDenied
      ? AccessState.Missing
      : AccessState.Unknown;
  }
}

export const macOsPermissionAdvisor = (
  context: PathContext,
  commands: CommandRunner,
): PermissionAdvisor => ({
  async fullDiskAccess() {
    const states = await Promise.all(
      MacPaths.fullDiskAccessProbes.map((probe) => accessTo(probe.resolve(context).toString())),
    );
    if (states.includes(AccessState.Missing)) return AccessState.Missing;
    return states.includes(AccessState.Granted) ? AccessState.Granted : AccessState.Unknown;
  },

  async openFullDiskAccessSettings() {
    const opened = await commands.run({
      ...MacCommand.openFullDiskAccessSettings,
      timeout: QUICK_COMMAND_TIMEOUT,
    });
    return opened.ok ? success(undefined) : failure({ reason: opened.error.detail });
  },
});
