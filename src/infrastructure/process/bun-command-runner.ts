import {
  CommandFailureKind,
  type CommandFailure,
  type CommandLine,
  type CommandOutput,
  type CommandRunner,
} from "../../application/index.ts";
import { failure, success, type Result } from "../../domain/index.ts";

const SUCCESS_EXIT_CODE = 0;

export const bunCommandRunner: CommandRunner = {
  async run(command: CommandLine): Promise<Result<CommandOutput, CommandFailure>> {
    const executable = Bun.which(command.executable);
    if (executable === null) {
      return failure({ kind: CommandFailureKind.NotFound, detail: command.executable });
    }
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
    if (child.signalCode !== null) {
      return failure({ kind: CommandFailureKind.TimedOut, detail: command.executable });
    }
    if (exitCode !== SUCCESS_EXIT_CODE) {
      return failure({ kind: CommandFailureKind.NonZeroExit, detail: standardError.trim() });
    }
    return success({ standardOutput, standardError });
  },
};
