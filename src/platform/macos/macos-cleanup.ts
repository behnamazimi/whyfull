import {
  CommandFailureKind,
  type AppActivity,
  type CommandFailure,
  type CommandRunner,
  type OwnerTools,
  type TrashBin,
} from "../../application/index.ts";
import {
  assertNever,
  failure,
  ProbeProblem,
  success,
  ToolProblem,
  toolNotReady,
  toolReady,
  type OwnerToolId,
  type ToolReadiness,
} from "../../domain/index.ts";
import {
  MacCommand,
  OWNER_TOOL_TIMEOUT,
  ownerToolCommands,
  QUICK_COMMAND_TIMEOUT,
  TRASH_COMMAND_TIMEOUT,
  type ToolProbe,
} from "./tools.ts";

const WORD_SEPARATOR = " ";
const NO_OUTPUT = "";

export const macOsTrashBin = (commands: CommandRunner): TrashBin => ({
  async moveToTrash(path) {
    const moved = await commands.run({
      ...MacCommand.moveToTrash(path.toString()),
      timeout: TRASH_COMMAND_TIMEOUT,
    });
    return moved.ok ? success(undefined) : failure({ reason: moved.error.detail });
  },
  async empty() {
    const emptied = await commands.run({
      ...MacCommand.emptyTrash,
      timeout: TRASH_COMMAND_TIMEOUT,
    });
    return emptied.ok ? success(undefined) : failure({ reason: emptied.error.detail });
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

const probeProblemOf = (failed: CommandFailure, probe: ToolProbe): ProbeProblem => {
  switch (failed.kind) {
    case CommandFailureKind.NotFound:
      return ProbeProblem.NotInstalled;
    case CommandFailureKind.TimedOut:
      return ProbeProblem.NotResponding;
    case CommandFailureKind.NonZeroExit:
      return probe.onNonZeroExit;
    default:
      return assertNever(failed.kind);
  }
};

const runProblemOf = (failed: CommandFailure): ToolProblem => {
  switch (failed.kind) {
    case CommandFailureKind.NotFound:
      return ToolProblem.NotInstalled;
    case CommandFailureKind.TimedOut:
      return ToolProblem.TimedOut;
    case CommandFailureKind.NonZeroExit:
      return ToolProblem.Failed;
    default:
      return assertNever(failed.kind);
  }
};

async function checkProbes(
  commands: CommandRunner,
  probes: readonly ToolProbe[],
): Promise<ToolReadiness> {
  for (const probe of probes) {
    const probed = await commands.run({ ...probe.command, timeout: QUICK_COMMAND_TIMEOUT });
    if (!probed.ok) return toolNotReady(probeProblemOf(probed.error, probe));
    if (probe.expect === undefined) continue;
    const printed = probed.value.standardOutput.trim();
    // Some Docker versions exit 0 and print nothing when the daemon is down.
    if (printed === NO_OUTPUT) return toolNotReady(probe.onNonZeroExit);
    if (printed !== probe.expect.output) return toolNotReady(probe.expect.otherwise);
  }
  return toolReady;
}

export const macOsOwnerTools = (commands: CommandRunner): OwnerTools => ({
  check: (tool: OwnerToolId) => checkProbes(commands, ownerToolCommands[tool].probes),
  describe: (tool: OwnerToolId) => {
    const command = ownerToolCommands[tool];
    return [command.executable, ...command.arguments].join(WORD_SEPARATOR);
  },
  async run(tool: OwnerToolId) {
    const { executable, arguments: toolArguments } = ownerToolCommands[tool];
    const ran = await commands.run({
      executable,
      arguments: toolArguments,
      timeout: OWNER_TOOL_TIMEOUT,
    });
    if (ran.ok) return success(undefined);
    const reason = ran.error.detail === NO_OUTPUT ? executable : ran.error.detail;
    return failure({ reason, problem: runProblemOf(ran.error) });
  },
});
