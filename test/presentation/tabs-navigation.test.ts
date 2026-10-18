import { describe, expect, test } from "bun:test";
import { DiagnosisUpdateKind } from "../../src/application/index.ts";
import {
  ByteSize,
  ChangeDirection,
  VolumeRole,
  type StorageLayout,
} from "../../src/domain/index.ts";
import { UiCopy } from "../../src/presentation/copy/ui-copy.ts";
import { UserAction } from "../../src/presentation/keymap.ts";
import { AppEventKind, type AppEvent } from "../../src/presentation/tui/state/app-event.ts";
import { initialAppState, type AppState } from "../../src/presentation/tui/state/app-state.ts";
import { reduce } from "../../src/presentation/tui/state/reducer.ts";
import { ScreenKind, Tab, tabOf } from "../../src/presentation/tui/state/screen.ts";
import { usageBreakdownOf } from "../../src/presentation/tui/view-models/disk-breakdown.ts";
import { buildTree } from "../support/domain-builders.ts";
import { sampleAppContext } from "../support/app-context.ts";
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
    { name: "Movies", ownFilesSize: ByteSize.fromMegabytes(600) },
  ],
});
const report = reportFor(home);

const layout: StorageLayout = {
  capacity: ByteSize.fromGigabytes(494),
  free: ByteSize.fromGigabytes(16),
  localSnapshotCount: 0,
  volumes: [
    { name: "Macintosh HD", role: VolumeRole.System, used: ByteSize.fromGigabytes(12) },
    { name: "Data", role: VolumeRole.Data, used: ByteSize.fromGigabytes(436) },
  ],
};

const action = (userAction: UserAction): AppEvent => ({
  kind: AppEventKind.ActionRequested,
  action: userAction,
});

const completed: AppEvent = {
  kind: AppEventKind.DiagnosisUpdated,
  update: { kind: DiagnosisUpdateKind.Completed, report },
};

const play = (state: AppState, ...events: readonly AppEvent[]): AppState =>
  events.reduce((current, event) => reduce(current, event).state, state);

const scanned = play(initialAppState(sampleAppContext), completed, {
  kind: AppEventKind.StorageDescribed,
  layout,
});

describe("tabs", () => {
  test("number keys and the old letters open the four tabs", () => {
    const keys = [
      [UserAction.BrowseFolders, Tab.Folders],
      [UserAction.ShowDiskOverview, Tab.Disk],
      [UserAction.ShowGrowth, Tab.Grew],
      [UserAction.ShowCleanup, Tab.Cleanup],
    ] as const;
    for (const [userAction, tab] of keys) {
      expect(tabOf(play(scanned, action(userAction)).screen)).toBe(tab);
    }
  });

  test("switching tabs never stacks screens: going back from a tab returns to Cleanup", () => {
    const onDisk = play(scanned, action(UserAction.ShowDiskOverview));
    expect(tabOf(play(onDisk, action(UserAction.Back)).screen)).toBe(Tab.Cleanup);
    const growthThenDisk = play(
      scanned,
      action(UserAction.ShowGrowth),
      action(UserAction.ShowDiskOverview),
      action(UserAction.Back),
    );
    expect(growthThenDisk.screen.kind).toBe(ScreenKind.Diagnosis);
  });

  test("pressing the key of the tab you are on changes nothing", () => {
    const onDisk = play(scanned, action(UserAction.ShowDiskOverview), action(UserAction.MoveDown));
    expect(play(onDisk, action(UserAction.ShowDiskOverview)).screen).toEqual(onDisk.screen);
  });

  test("the selection follows you from tab to tab", () => {
    const picked = play(scanned, action(UserAction.ToggleCleanup));
    expect(picked.cart.size).toBeGreaterThan(0);
    const across = play(
      picked,
      action(UserAction.BrowseFolders),
      action(UserAction.ShowDiskOverview),
      action(UserAction.ShowCleanup),
    );
    expect(across.cart).toEqual(picked.cart);
  });

  test("the folders tab waits for the scan instead of showing nothing", () => {
    const { state } = reduce(initialAppState(sampleAppContext), action(UserAction.BrowseFolders));
    expect(state.screen.kind).toBe(ScreenKind.Diagnosis);
    expect(state.notice).toBe(UiCopy.notices.waitForScan);
  });

  test("tab keys do nothing while a dialog is open", () => {
    const inHelp = play(scanned, action(UserAction.Help));
    expect(inHelp.screen.kind).toBe(ScreenKind.Help);
    for (const userAction of [
      UserAction.BrowseFolders,
      UserAction.ShowDiskOverview,
      UserAction.ShowGrowth,
      UserAction.ShowCleanup,
      UserAction.AskAssistant,
      UserAction.SelectAllSafe,
    ]) {
      expect(play(inHelp, action(userAction)).screen).toEqual(inHelp.screen);
    }
  });

  test("a dialog can always be left, and quit still works", () => {
    const inHelp = play(scanned, action(UserAction.Help));
    expect(play(inHelp, action(UserAction.Back)).screen.kind).toBe(ScreenKind.Diagnosis);
    expect(play(inHelp, action(UserAction.Help)).screen.kind).toBe(ScreenKind.Diagnosis);
    const { effects } = reduce(inHelp, action(UserAction.Quit));
    expect(effects).toHaveLength(1);
  });

  test("the disk list moves over every row and stops at the last", () => {
    let state = play(scanned, action(UserAction.ShowDiskOverview));
    const breakdown = usageBreakdownOf(state);
    const rows = (breakdown?.shares.length ?? 0) + 1;
    for (let step = 0; step < rows + 2; step += 1) state = play(state, action(UserAction.MoveDown));
    expect(state.screen.kind).toBe(ScreenKind.DiskOverview);
    expect(state.screen.kind === ScreenKind.DiskOverview ? state.screen.selected : -1).toBe(
      rows - 1,
    );
  });

  test("a grown folder opens in the folders tab, and an empty list stays put", () => {
    const empty = play(scanned, action(UserAction.ShowGrowth), action(UserAction.Open));
    expect(empty.screen.kind).toBe(ScreenKind.Growth);
    const library = SAMPLE_HOME.child("Library");
    const withGrowth = play(scanned, {
      kind: AppEventKind.HistoryCompared,
      diff: {
        previousTakenAt: new Date(0),
        total: { direction: ChangeDirection.Grew, amount: ByteSize.fromGigabytes(1) },
        currentHasUnreadableFolders: false,
        grownFolders: [
          {
            path: library,
            before: ByteSize.fromGigabytes(1),
            beforeKnown: true,
            after: ByteSize.fromGigabytes(2),
            growth: ByteSize.fromGigabytes(1),
          },
        ],
      },
    });
    const opened = play(withGrowth, action(UserAction.ShowGrowth), action(UserAction.Open));
    expect(opened.screen.kind).toBe(ScreenKind.Folders);
    expect(opened.screen.kind === ScreenKind.Folders ? opened.screen.folder : undefined).toEqual(
      library,
    );
  });
});
