import type { Clipboard, CommandRunner } from "../../application/index.ts";
import { failure, success } from "../../domain/index.ts";
import { MacCommand, QUICK_COMMAND_TIMEOUT } from "./tools.ts";

export const pasteboardClipboard = (commands: CommandRunner): Clipboard => ({
  async copy(text) {
    const result = await commands.run({
      ...MacCommand.copyToClipboard,
      timeout: QUICK_COMMAND_TIMEOUT,
      input: text,
    });
    return result.ok ? success(undefined) : failure({ reason: result.error.detail });
  },
});
