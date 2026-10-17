import {
  CommandFailureKind,
  type CommandFailure,
  type CommandLine,
  type CommandOutput,
  type CommandRunner,
} from "../../application/index.ts";
import { failure, success, type Result } from "../../domain/index.ts";

const SUCCESS_EXIT_CODE = 0;
const NO_DETAIL = "";

export const bunCommandRunner: CommandRunner = {
  async run(command: CommandLine): Promise<Result<CommandOutput, CommandFailure>> {
    const executable = Bun.which(command.executable);
    if (executable === null) {
      return failure({ kind: CommandFailureKind.NotFound, detail: command.executable });
    }
    const startedAt = Date.now();
    const child = Bun.spawn([executable, ...command.arguments], {
      stdin: command.input === undefined ? "ignore" : new TextEncoder().encode(command.input),
      stdout: "pipe",
      stderr: "pipe",
      timeout: command.timeout.milliseconds,
    });
    const [standardOutput, standardError, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    const { signalCode } = child;
    // Bun's timeout ends the child with a signal, but so does a crash or an out-of-memory kill.
    const ranOutOfTime = Date.now() - startedAt >= command.timeout.milliseconds;
    if (signalCode !== null && ranOutOfTime) {
      return failure({ kind: CommandFailureKind.TimedOut, detail: command.executable });
    }
    if (signalCode !== null || exitCode !== SUCCESS_EXIT_CODE) {
      const detail = standardError.trim();
      return failure({
        kind: CommandFailureKind.NonZeroExit,
        detail: detail === NO_DETAIL && signalCode !== null ? String(signalCode) : detail,
      });
    }
    return success({ standardOutput, standardError });
  },
};
