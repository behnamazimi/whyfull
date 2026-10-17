import { describe, expect, test } from "bun:test";
import { DiagnosisUpdateKind } from "../../src/application/index.ts";
import { ByteSize, ChangeDirection, VolumeRole } from "../../src/domain/index.ts";
import { UserAction } from "../../src/presentation/keymap.ts";
import { AppEventKind, type AppEvent } from "../../src/presentation/tui/state/app-event.ts";
import { initialAppState, type AppState } from "../../src/presentation/tui/state/app-state.ts";
import { reduce } from "../../src/presentation/tui/state/reducer.ts";
import { appView } from "../../src/presentation/tui/view-models/app-view.ts";
import {
  Density,
  densityFor,
  frameLinesFor,
  totalFrameLines,
} from "../../src/presentation/tui/view-models/density.ts";
import { Layout, MinimumViewport } from "../../src/presentation/tui/view-models/layout.ts";
import { ListEntryKind } from "../../src/presentation/tui/view-models/list-row.ts";
import { buildTree, REFERENCE_DATE } from "../support/domain-builders.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { reportFor, SAMPLE_HOME } from "../support/report-builder.ts";

const VIEWPORTS = [
  { columns: 80, rows: 18 },
  { columns: 80, rows: 24 },
  { columns: 100, rows: 30 },
  { columns: 110, rows: 42 },
  { columns: 200, rows: 60 },
] as const;
const MARKER_AND_CHIP_LINES = Layout.listMarkerLines + Layout.filterChipLines;
const FEWEST_ROWS_IN_SMALLEST_WINDOW = 5;

const names = ["Movies", "Music", "Projects", "Games", "Archive", "Photos", "Videos", "Backups"];
const report = reportFor(
  buildTree(SAMPLE_HOME.toString(), {
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
      ...names.map((name, index) => ({
        name,
        ownFilesSize: ByteSize.fromGigabytes(index + 2),
      })),
    ],
  }),
);

const events: readonly AppEvent[] = [
  { kind: AppEventKind.DiagnosisUpdated, update: { kind: DiagnosisUpdateKind.Completed, report } },
  {
    kind: AppEventKind.VolumeMeasured,
    usage: {
      capacity: ByteSize.fromGigabytes(500),
      used: ByteSize.fromGigabytes(480),
      available: ByteSize.fromGigabytes(20),
    },
  },
  {
    kind: AppEventKind.StorageDescribed,
    layout: {
      capacity: ByteSize.fromGigabytes(500),
      free: ByteSize.fromGigabytes(20),
      localSnapshotCount: 1,
      volumes: [
        { name: "Macintosh HD", role: VolumeRole.System, used: ByteSize.fromGigabytes(12) },
        { name: "Data", role: VolumeRole.Data, used: ByteSize.fromGigabytes(468) },
      ],
    },
  },
  {
    kind: AppEventKind.HistoryCompared,
    diff: {
      previousTakenAt: REFERENCE_DATE,
      total: { direction: ChangeDirection.Grew, amount: ByteSize.fromGigabytes(2) },
      grownFolders: [
        {
          path: SAMPLE_HOME.child("Movies"),
          before: ByteSize.fromGigabytes(1),
          after: ByteSize.fromGigabytes(3),
          growth: ByteSize.fromGigabytes(2),
        },
      ],
    },
  },
];
const scanned = events.reduce<AppState>(
  (state, event) => reduce(state, event).state,
  initialAppState(sampleAppContext),
);
const onTab = (action: UserAction): AppState =>
  reduce(scanned, { kind: AppEventKind.ActionRequested, action }).state;

const TABS = [
  ["Cleanup", scanned],
  ["Folders", onTab(UserAction.BrowseFolders)],
  ["Disk", onTab(UserAction.ShowDiskOverview)],
  ["What grew", onTab(UserAction.ShowGrowth)],
] as const;

describe("the screen frame", () => {
  test("gives the screen exactly what the frame leaves, in every window and on every tab", () => {
    for (const viewport of VIEWPORTS) {
      for (const [, state] of TABS) {
        const view = appView(state, viewport, REFERENCE_DATE);
        const room = viewport.rows - totalFrameLines(densityFor(viewport.rows));
        const used =
          view.body.entries.length +
          MARKER_AND_CHIP_LINES +
          ("caption" in view.body && view.body.caption !== undefined ? 1 : 0);
        expect(used).toBeLessThanOrEqual(room);
      }
    }
  });

  test("always leaves a usable list in the smallest supported window", () => {
    const view = appView(scanned, MinimumViewport, REFERENCE_DATE);
    const rows = view.body.entries.filter((entry) => entry.kind === ListEntryKind.Row);
    expect(rows.length).toBeGreaterThanOrEqual(FEWEST_ROWS_IN_SMALLEST_WINDOW);
    expect(densityFor(MinimumViewport.rows)).toBe(Density.Compact);
  });

  test("never lets the tabs, legend or keys run wider than the window", () => {
    for (const viewport of VIEWPORTS) {
      for (const [, state] of TABS) {
        const view = appView(state, viewport, REFERENCE_DATE);
        const keys = view.keys.hints.reduce(
          (total, hint) => total + hint.key.length + 1 + hint.label.length,
          0,
        );
        expect(keys).toBeLessThan(viewport.columns);
        const legend = view.summary.legend.reduce(
          (total, item) => total + item.text.length + item.value.length + 2,
          0,
        );
        expect(legend).toBeLessThan(viewport.columns);
        const tabs = view.tabs.tabs.reduce(
          (total, tab) => total + tab.key.length + tab.label.length + 3,
          0,
        );
        expect(tabs + view.tabs.scope.length).toBeLessThanOrEqual(viewport.columns);
      }
    }
  });

  test("shows the same four tabs, and the same action bar, on every tab", () => {
    for (const [label, state] of TABS) {
      const view = appView(state, VIEWPORTS[2], REFERENCE_DATE);
      expect(view.tabs.tabs.map((tab) => tab.label)).toHaveLength(4);
      expect(view.tabs.tabs.filter((tab) => tab.active).map((tab) => tab.label)).toEqual([label]);
      expect(view.actionBar.button?.label).toBeDefined();
      expect(view.keys.hints.at(-1)?.key).toBe("q");
    }
  });

  test("puts the chosen row beside the list when wide, and under it when narrow", () => {
    const wide = appView(scanned, { columns: 120, rows: 40 }, REFERENCE_DATE).body;
    const narrow = appView(scanned, { columns: 90, rows: 40 }, REFERENCE_DATE).body;
    expect("pane" in wide && wide.pane !== undefined).toBe(true);
    expect("caption" in wide && wide.caption === undefined).toBe(true);
    expect("pane" in narrow && narrow.pane === undefined).toBe(true);
    expect("caption" in narrow && narrow.caption !== undefined).toBe(true);
  });
});

describe("density", () => {
  test("is chosen by height: tall windows show everything, short ones the essentials", () => {
    expect(densityFor(60)).toBe(Density.Roomy);
    expect(densityFor(32)).toBe(Density.Roomy);
    expect(densityFor(31)).toBe(Density.Snug);
    expect(densityFor(24)).toBe(Density.Snug);
    expect(densityFor(23)).toBe(Density.Compact);
  });

  test("every density fits the smallest window and leaves room for rows", () => {
    for (const density of Object.values(Density)) {
      expect(totalFrameLines(density)).toBeLessThan(MinimumViewport.rows);
    }
    expect(frameLinesFor(Density.Compact).keys).toBe(1);
  });
});
