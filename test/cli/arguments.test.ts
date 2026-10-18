import { describe, expect, test } from "bun:test";
import {
  ArgumentProblemKind,
  CommandKind,
  parseCommand,
  ReportFormat,
  ScanTargetKind,
} from "../../src/cli/arguments.ts";
import { CliCopy } from "../../src/cli/cli-copy.ts";

const FOLDER = "~/Downloads";

describe("parseCommand", () => {
  test("opens the interactive view on the home folder by default", () => {
    expect(parseCommand([])).toEqual({
      ok: true,
      value: {
        kind: CommandKind.Interactive,
        target: { kind: ScanTargetKind.Folder, folder: undefined },
      },
    });
  });

  test("takes one folder for the interactive view and for report", () => {
    expect(parseCommand([FOLDER])).toMatchObject({
      ok: true,
      value: { kind: CommandKind.Interactive, target: { folder: FOLDER } },
    });
    expect(parseCommand(["report", FOLDER, "--json"])).toEqual({
      ok: true,
      value: {
        kind: CommandKind.Report,
        target: { kind: ScanTargetKind.Folder, folder: FOLDER },
        format: ReportFormat.Json,
      },
    });
  });

  test("reports the whole disk", () => {
    expect(parseCommand(["report", "--whole-disk"])).toMatchObject({
      ok: true,
      value: { kind: CommandKind.Report, target: { kind: ScanTargetKind.WholeDisk } },
    });
  });

  test.each([
    [["--help"], CommandKind.Help],
    [["-h"], CommandKind.Help],
    [["help"], CommandKind.Help],
    [["--version"], CommandKind.Version],
    [["-v"], CommandKind.Version],
    [["version"], CommandKind.Version],
  ])("reads %p as %p, not as a folder", (argv, kind) => {
    expect(parseCommand(argv)).toEqual({ ok: true, value: { kind } });
  });

  test.each([
    [["--verbose"], { kind: ArgumentProblemKind.UnknownOption, option: "--verbose" }],
    [["-x"], { kind: ArgumentProblemKind.UnknownOption, option: "-x" }],
    [["report", "--jsn"], { kind: ArgumentProblemKind.UnknownOption, option: "--jsn" }],
    [["--json=yes"], { kind: ArgumentProblemKind.OptionTakesNoValue, option: "--json" }],
    [[FOLDER, "extra"], { kind: ArgumentProblemKind.ExtraArgument, argument: "extra" }],
    [["report", FOLDER, "extra"], { kind: ArgumentProblemKind.ExtraArgument, argument: "extra" }],
    [["help", "me"], { kind: ArgumentProblemKind.ExtraArgument, argument: "me" }],
    [["--json"], { kind: ArgumentProblemKind.JsonNeedsReport }],
    [[FOLDER, "--whole-disk"], { kind: ArgumentProblemKind.FolderAndWholeDisk }],
  ])("refuses %p", (argv, problem) => {
    expect(parseCommand(argv)).toEqual({ ok: false, error: problem });
  });

  test("treats anything after -- as a folder name", () => {
    expect(parseCommand(["report", "--", "--json"])).toMatchObject({
      ok: true,
      value: { kind: CommandKind.Report, target: { folder: "--json" }, format: ReportFormat.Text },
    });
  });

  test("explains every problem in plain words, without internal error names", () => {
    const message = CliCopy.argumentProblem({
      kind: ArgumentProblemKind.UnknownOption,
      option: "--verbose",
    });
    expect(message).toContain('"--verbose"');
    expect(message).not.toContain("ERR_");
  });
});
