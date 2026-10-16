import { describe, expect, test } from "bun:test";
import { DiagnosisUpdateKind } from "../../src/application/index.ts";
import { ByteSize, FindingKind } from "../../src/domain/index.ts";
import { UiCopy } from "../../src/presentation/copy/ui-copy.ts";
import { UserAction } from "../../src/presentation/keymap.ts";
import {
  AppEventKind,
  EffectKind,
  type AppEvent,
} from "../../src/presentation/tui/state/app-event.ts";
import { initialAppState, type AppState } from "../../src/presentation/tui/state/app-state.ts";
import { reduce } from "../../src/presentation/tui/state/reducer.ts";
import { ScreenKind } from "../../src/presentation/tui/state/screen.ts";
import { buildTree } from "../support/domain-builders.ts";
import { sampleAppContext, sampleWholeDiskScope } from "../support/app-context.ts";
import { reportFor, SAMPLE_HOME } from "../support/report-builder.ts";

const home = buildTree(SAMPLE_HOME.toString(), {
  children: [
    {
      name: "Library",
      children: [
        {
          name: "Caches",
          ownFilesSize: ByteSize.fromGigabytes(1),
          children: [{ name: "Homebrew", ownFilesSize: ByteSize.fromGigabytes(3) }],
        },
      ],
    },
    {
      name: "Movies",
      children: [
        { name: "trip", ownFilesSize: ByteSize.fromMegabytes(600) },
        { name: "wedding", ownFilesSize: ByteSize.fromMegabytes(600) },
      ],
    },
  ],
});
const report = reportFor(home);

const startingState = initialAppState(sampleAppContext);

const action = (userAction: UserAction): AppEvent => ({
  kind: AppEventKind.ActionRequested,
  action: userAction,
});

const completed: AppEvent = {
  kind: AppEventKind.DiagnosisUpdated,
  update: { kind: DiagnosisUpdateKind.Completed, report },
};

function play(...events: readonly AppEvent[]): { state: AppState; effects: unknown[] } {
  let state = startingState;
  const effects: unknown[] = [];
  for (const event of events) {
    const transition = reduce(state, event);
    state = transition.state;
    effects.push(...transition.effects);
  }
  return { state, effects };
}

describe("TUI reducer", () => {
  test("asks to wait while folder details are not ready", () => {
    expect(play(action(UserAction.BrowseFolders)).state.notice).toBe(UiCopy.notices.waitForScan);
  });

  test("opens the selected finding and returns with back", () => {
    const opened = play(completed, action(UserAction.Open)).state;
    expect(opened.screen.kind).toBe(ScreenKind.FindingDetail);
    expect(
      play(completed, action(UserAction.Open), action(UserAction.Back)).state.screen.kind,
    ).toBe(ScreenKind.Diagnosis);
  });

  test("keeps the selection inside the list", () => {
    const { state } = play(completed, action(UserAction.PageDown), action(UserAction.PageDown));
    expect(state.screen.kind === ScreenKind.Diagnosis && state.screen.selected).toBe(
      report.findings.length - 1,
    );
  });

  test("opens unexplained folders in the folder browser", () => {
    const unexplainedIndex = report.findings.findIndex(
      (finding) => finding.kind === FindingKind.UnexplainedFolder,
    );
    const { state } = play(completed, { kind: AppEventKind.RowClicked, index: unexplainedIndex });
    expect(state.screen.kind === ScreenKind.Folders && state.screen.folder.toString()).toBe(
      "/Users/sam/Movies",
    );
  });

  test("previews the assistant prompt and copies it only on confirmation", () => {
    const previewed = play(completed, action(UserAction.AskAssistant));
    expect(previewed.state.screen.kind).toBe(ScreenKind.PromptPreview);
    expect(previewed.effects).toEqual([]);
    const text =
      previewed.state.screen.kind === ScreenKind.PromptPreview ? previewed.state.screen.text : "";
    expect(text).toContain("~/Library/Caches/Homebrew");
    expect(text).not.toContain("/Users/sam");

    const confirmed = play(completed, action(UserAction.AskAssistant), action(UserAction.Open));
    expect(confirmed.effects).toEqual([{ kind: EffectKind.CopyToClipboard, text }]);
    expect(confirmed.state.screen.kind).toBe(ScreenKind.Diagnosis);
  });

  test("quits through an effect", () => {
    expect(play(action(UserAction.Quit)).effects).toEqual([{ kind: EffectKind.Quit }]);
  });
});

describe("disk overview and permissions", () => {
  test("scanning the whole disk restarts the scan through an effect", () => {
    const { state, effects } = play(completed, action(UserAction.ScanWholeDisk));
    expect(effects).toEqual([{ kind: EffectKind.StartScan, scope: sampleWholeDiskScope }]);
    expect(state.scope).toEqual(sampleWholeDiskScope);
    expect(state.scan.findings).toEqual([]);
    expect(
      play(completed, action(UserAction.ScanWholeDisk), action(UserAction.ScanWholeDisk)).effects,
    ).toHaveLength(1);
  });

  test("the permission guide opens System Settings only when confirmed", () => {
    const guide = play(action(UserAction.FixPermissions));
    expect(guide.state.screen.kind).toBe(ScreenKind.PermissionGuide);
    expect(guide.effects).toEqual([]);
    expect(play(action(UserAction.FixPermissions), action(UserAction.Open)).effects).toEqual([
      { kind: EffectKind.OpenPermissionSettings },
    ]);
  });

  test("the disk overview is reachable from anywhere and closes with back", () => {
    const { state } = play(action(UserAction.ShowDiskOverview), action(UserAction.Back));
    expect(state.screen.kind).toBe(ScreenKind.Diagnosis);
  });
});
