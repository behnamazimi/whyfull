import { describe, expect, test } from "bun:test";
import {
  CommandFailureKind,
  type CommandFailure,
  type CommandLine,
  type CommandOutput,
  type CommandRunner,
} from "../../src/application/index.ts";
import {
  failure,
  OwnerToolId,
  ProbeProblem,
  success,
  ToolProblem,
  type Result,
} from "../../src/domain/index.ts";
import { macOsOwnerTools } from "../../src/platform/macos/macos-cleanup.ts";
import {
  DOCKER_DESKTOP_ENGINE_NAME,
  ownerToolCommands,
  QUICK_COMMAND_TIMEOUT,
} from "../../src/platform/macos/tools.ts";

type Reply = Result<CommandOutput, CommandFailure>;

const output = (standardOutput: string): Reply => success({ standardOutput, standardError: "" });
const failed = (kind: CommandFailureKind, detail = ""): Reply => failure({ kind, detail });

function scriptedRunner(replies: Record<string, Reply>): {
  readonly runner: CommandRunner;
  readonly seen: CommandLine[];
} {
  const seen: CommandLine[] = [];
  return {
    seen,
    runner: {
      run(command) {
        seen.push(command);
        const key = [command.executable, ...command.arguments].join(" ");
        return Promise.resolve(replies[key] ?? failed(CommandFailureKind.NotFound, key));
      },
    },
  };
}

const XCODE_SELECT = "xcode-select -p";
const FIND_SIMCTL = "xcrun --find simctl";
const DOCKER_INFO = "docker info --format {{.OperatingSystem}}";
const SIMULATOR_CLEANUP = "xcrun simctl delete unavailable";

describe("macOsOwnerTools.check", () => {
  test("accepts simulators when simctl can be found", async () => {
    const { runner } = scriptedRunner({
      [XCODE_SELECT]: output("/Applications/Xcode.app/Contents/Developer\n"),
      [FIND_SIMCTL]: output("/Applications/Xcode.app/Contents/Developer/usr/bin/simctl\n"),
    });
    const readiness = await macOsOwnerTools(runner).check(OwnerToolId.SimulatorCleanup);
    expect(readiness).toEqual({ ready: true });
  });

  test("calls xcrun without simctl unusable, as with only the command line tools", async () => {
    const { runner } = scriptedRunner({
      [XCODE_SELECT]: output("/Library/Developer/CommandLineTools\n"),
      [FIND_SIMCTL]: failed(CommandFailureKind.NonZeroExit, 'unable to find utility "simctl"'),
    });
    const readiness = await macOsOwnerTools(runner).check(OwnerToolId.SimulatorCleanup);
    expect(readiness).toEqual({ ready: false, problem: ProbeProblem.Unusable });
  });

  test("never asks xcrun anything when there is no developer folder", async () => {
    const { runner, seen } = scriptedRunner({
      [XCODE_SELECT]: failed(CommandFailureKind.NonZeroExit, "no developer tools were found"),
    });
    const readiness = await macOsOwnerTools(runner).check(OwnerToolId.SimulatorCleanup);
    expect(readiness).toEqual({ ready: false, problem: ProbeProblem.Unusable });
    expect(seen.map((command) => command.executable)).toEqual(["xcode-select"]);
  });

  test("accepts Docker when Docker Desktop answers", async () => {
    const { runner } = scriptedRunner({ [DOCKER_INFO]: output(`${DOCKER_DESKTOP_ENGINE_NAME}\n`) });
    expect(await macOsOwnerTools(runner).check(OwnerToolId.DockerPrune)).toEqual({ ready: true });
  });

  test.each([
    ["is not installed", failed(CommandFailureKind.NotFound), ProbeProblem.NotInstalled],
    ["is not running", failed(CommandFailureKind.NonZeroExit), ProbeProblem.NotRunning],
    ["does not answer", failed(CommandFailureKind.TimedOut), ProbeProblem.NotResponding],
    ["belongs to another app", output("OrbStack\n"), ProbeProblem.WrongEngine],
  ])("blocks Docker when it %s", async (_situation, reply, problem) => {
    const { runner } = scriptedRunner({ [DOCKER_INFO]: reply });
    const readiness = await macOsOwnerTools(runner).check(OwnerToolId.DockerPrune);
    expect(readiness).toEqual({ ready: false, problem });
  });

  test("treats a Docker that exits cleanly but prints nothing as not running", async () => {
    const { runner } = scriptedRunner({ [DOCKER_INFO]: output("\n") });
    const readiness = await macOsOwnerTools(runner).check(OwnerToolId.DockerPrune);
    expect(readiness).toEqual({ ready: false, problem: ProbeProblem.NotRunning });
  });

  test("gives every probe the quick timeout", async () => {
    const { runner, seen } = scriptedRunner({
      [XCODE_SELECT]: output("/Applications/Xcode.app/Contents/Developer\n"),
      [FIND_SIMCTL]: output("/usr/bin/simctl\n"),
    });
    await macOsOwnerTools(runner).check(OwnerToolId.SimulatorCleanup);
    expect(seen.map((command) => command.timeout)).toEqual([
      QUICK_COMMAND_TIMEOUT,
      QUICK_COMMAND_TIMEOUT,
    ]);
  });

  test("gives every owner tool at least one probe", () => {
    for (const tool of Object.values(OwnerToolId)) {
      expect(ownerToolCommands[tool].probes.length).toBeGreaterThan(0);
    }
  });
});

describe("macOsOwnerTools.run", () => {
  test.each([
    ["is missing", failed(CommandFailureKind.NotFound, "xcrun"), ToolProblem.NotInstalled],
    ["times out", failed(CommandFailureKind.TimedOut, "xcrun"), ToolProblem.TimedOut],
    ["fails", failed(CommandFailureKind.NonZeroExit, "boom"), ToolProblem.Failed],
  ])("keeps why the tool %s", async (_situation, reply, problem) => {
    const { runner } = scriptedRunner({ [SIMULATOR_CLEANUP]: reply });
    const ran = await macOsOwnerTools(runner).run(OwnerToolId.SimulatorCleanup);
    expect(ran.ok).toBe(false);
    if (!ran.ok) expect(ran.error.problem).toBe(problem);
  });

  test("names the tool when it fails without saying anything", async () => {
    const { runner } = scriptedRunner({
      [SIMULATOR_CLEANUP]: failed(CommandFailureKind.NonZeroExit, ""),
    });
    const ran = await macOsOwnerTools(runner).run(OwnerToolId.SimulatorCleanup);
    if (ran.ok) throw new Error("expected a failure");
    expect(ran.error.reason).toBe("xcrun");
  });

  test("runs only the cleanup command", async () => {
    const { runner, seen } = scriptedRunner({ [SIMULATOR_CLEANUP]: output("") });
    expect((await macOsOwnerTools(runner).run(OwnerToolId.SimulatorCleanup)).ok).toBe(true);
    expect(seen).toHaveLength(1);
    expect(Object.keys(seen[0] ?? {}).sort()).toEqual(["arguments", "executable", "timeout"]);
  });
});

describe("Docker's cleanup command", () => {
  // `--all` would also remove images people built themselves, which can't be downloaded again.
  test("keeps named images", () => {
    expect(ownerToolCommands[OwnerToolId.DockerPrune].arguments).toEqual([
      "system",
      "prune",
      "--force",
    ]);
  });
});
