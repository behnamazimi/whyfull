import { describe, expect, test } from "bun:test";
import { CommandFailureKind, type CommandLine } from "../../src/application/index.ts";
import { Duration } from "../../src/domain/index.ts";
import { bunCommandRunner } from "../../src/infrastructure/process/bun-command-runner.ts";

const GENEROUS_TIMEOUT = Duration.ofSeconds(10);
const SHORT_TIMEOUT = Duration.ofMilliseconds(200);
// `exec` replaces the shell, so killing it also closes the output pipes.
const LONG_SLEEP_SECONDS = "5";

const shell = (script: string, timeout: Duration): CommandLine => ({
  executable: "sh",
  arguments: ["-c", script],
  timeout,
});

describe("bunCommandRunner", () => {
  test("returns what the command printed", async () => {
    const ran = await bunCommandRunner.run(shell("printf hello", GENEROUS_TIMEOUT));
    expect(ran.ok && ran.value.standardOutput).toBe("hello");
  });

  test("reports a missing executable by name", async () => {
    const ran = await bunCommandRunner.run({
      executable: "whyfull-no-such-command",
      arguments: [],
      timeout: GENEROUS_TIMEOUT,
    });
    expect(!ran.ok && ran.error).toEqual({
      kind: CommandFailureKind.NotFound,
      detail: "whyfull-no-such-command",
    });
  });

  test("reports a failing command with what it said", async () => {
    const ran = await bunCommandRunner.run(shell("echo broken >&2; exit 3", GENEROUS_TIMEOUT));
    expect(!ran.ok && ran.error).toEqual({
      kind: CommandFailureKind.NonZeroExit,
      detail: "broken",
    });
  });

  test("reports a command that outlives its timeout as timed out", async () => {
    const ran = await bunCommandRunner.run(
      shell(`exec sleep ${LONG_SLEEP_SECONDS}`, SHORT_TIMEOUT),
    );
    expect(!ran.ok && ran.error.kind).toBe(CommandFailureKind.TimedOut);
  });

  test("does not call a command killed early a timeout", async () => {
    const ran = await bunCommandRunner.run(shell("kill -9 $$", GENEROUS_TIMEOUT));
    expect(!ran.ok && ran.error.kind).toBe(CommandFailureKind.NonZeroExit);
    expect(!ran.ok && ran.error.detail).not.toBe("");
  });
});
