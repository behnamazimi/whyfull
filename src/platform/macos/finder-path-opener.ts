import type { CommandRunner, PathOpener } from "../../application/index.ts";
import { failure, success } from "../../domain/index.ts";
import { MacCommand, QUICK_COMMAND_TIMEOUT } from "./tools.ts";

export const finderPathOpener = (commands: CommandRunner): PathOpener => ({
  async reveal(path) {
    const result = await commands.run({
      ...MacCommand.revealInFinder(path.toString()),
      timeout: QUICK_COMMAND_TIMEOUT,
    });
    return result.ok ? success(undefined) : failure({ reason: result.error.detail });
  },
});
