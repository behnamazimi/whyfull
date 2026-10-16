import type { Duration, Result } from "../../domain/index.ts";

export interface CommandLine {
  readonly executable: string;
  readonly arguments: readonly string[];
  readonly timeout: Duration;
  readonly input?: string;
}

export interface CommandOutput {
  readonly standardOutput: string;
  readonly standardError: string;
}

export const CommandFailureKind = {
  NotFound: "not-found",
  NonZeroExit: "non-zero-exit",
  TimedOut: "timed-out",
} as const;
export type CommandFailureKind = (typeof CommandFailureKind)[keyof typeof CommandFailureKind];

export interface CommandFailure {
  readonly kind: CommandFailureKind;
  readonly detail: string;
}

export interface CommandRunner {
  run(command: CommandLine): Promise<Result<CommandOutput, CommandFailure>>;
}
