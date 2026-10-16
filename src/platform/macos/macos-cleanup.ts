import type { AppActivity, CommandRunner, OwnerTools, TrashBin } from "../../application/index.ts";
import { failure, success, type OwnerToolId } from "../../domain/index.ts";
import {
  MacCommand,
  OWNER_TOOL_TIMEOUT,
  ownerToolCommands,
  QUICK_COMMAND_TIMEOUT,
  TRASH_COMMAND_TIMEOUT,
} from "./tools.ts";

const WORD_SEPARATOR = " ";

export const macOsTrashBin = (commands: CommandRunner): TrashBin => ({
  async moveToTrash(path) {
    const moved = await commands.run({
      ...MacCommand.moveToTrash(path.toString()),
      timeout: TRASH_COMMAND_TIMEOUT,
    });
    return moved.ok ? success(undefined) : failure({ reason: moved.error.detail });
  },
});

export const macOsAppActivity = (
  commands: CommandRunner,
  userId: number | undefined = process.getuid?.(),
): AppActivity => ({
  async runningAppNames() {
    const listing = await commands.run({
      ...MacCommand.runningAppNames(userId),
      timeout: QUICK_COMMAND_TIMEOUT,
    });
    if (!listing.ok) return new Set();
    return new Set(listing.value.standardOutput.split("\n").map((line) => line.trim()));
  },
});

export const macOsOwnerTools = (commands: CommandRunner): OwnerTools => ({
  isAvailable: (tool: OwnerToolId) => Bun.which(ownerToolCommands[tool].executable) !== null,
  describe: (tool: OwnerToolId) => {
    const command = ownerToolCommands[tool];
    return [command.executable, ...command.arguments].join(WORD_SEPARATOR);
  },
  async run(tool: OwnerToolId) {
    const ran = await commands.run({ ...ownerToolCommands[tool], timeout: OWNER_TOOL_TIMEOUT });
    return ran.ok ? success(undefined) : failure({ reason: ran.error.detail });
  },
});
