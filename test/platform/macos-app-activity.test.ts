import { describe, expect, test } from "bun:test";
import type { CommandLine, CommandRunner } from "../../src/application/index.ts";
import { success } from "../../src/domain/index.ts";
import { macOsAppActivity, macOsTrashBin } from "../../src/platform/macos/macos-cleanup.ts";
import { finderPathOpener } from "../../src/platform/macos/finder-path-opener.ts";
import { pathOf } from "../support/domain-builders.ts";

const SAMPLE_USER_ID = 501;
const PS_OUTPUT = "Finder\nNotion\n Google Chrome \n";

function recordingRunner(): { readonly runner: CommandRunner; readonly seen: CommandLine[] } {
  const seen: CommandLine[] = [];
  return {
    seen,
    runner: {
      run(command) {
        seen.push(command);
        return Promise.resolve(success({ standardOutput: PS_OUTPUT, standardError: "" }));
      },
    },
  };
}

describe("macOsAppActivity", () => {
  test("lists only the current user's processes, trimmed", async () => {
    const { runner, seen } = recordingRunner();
    const names = await macOsAppActivity(runner, SAMPLE_USER_ID).runningAppNames();
    expect(names).toEqual(new Set(["Finder", "Notion", "Google Chrome", ""]));
    expect(seen[0]?.arguments).toEqual(["-x", "-U", String(SAMPLE_USER_ID), "-co", "comm="]);
  });
});

describe("macOS Finder actions", () => {
  test("shows an item in Finder with open -R", async () => {
    const { runner, seen } = recordingRunner();
    const shown = await finderPathOpener(runner).reveal(pathOf("/Users/sam/Movies/trip.mov"));
    expect(shown.ok).toBe(true);
    expect(seen[0]).toMatchObject({
      executable: "open",
      arguments: ["-R", "/Users/sam/Movies/trip.mov"],
    });
  });

  test("empties the Trash through Finder, not by deleting files itself", async () => {
    const { runner, seen } = recordingRunner();
    const emptied = await macOsTrashBin(runner).empty();
    expect(emptied.ok).toBe(true);
    expect(seen[0]?.executable).toBe("osascript");
    expect(seen[0]?.arguments.join(" ")).toContain("Finder");
  });
});
