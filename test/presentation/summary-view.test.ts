import { describe, expect, test } from "bun:test";
import { DiagnosisUpdateKind } from "../../src/application/index.ts";
import { ByteSize, ChangeDirection, VolumeRole } from "../../src/domain/index.ts";
import { UiCopy } from "../../src/presentation/copy/ui-copy.ts";
import { UserAction } from "../../src/presentation/keymap.ts";
import { ColorRole, Glyph } from "../../src/presentation/theme.ts";
import { AppEventKind, type AppEvent } from "../../src/presentation/tui/state/app-event.ts";
import {
  initialAppState,
  ScanStatus,
  type AppState,
} from "../../src/presentation/tui/state/app-state.ts";
import { reduce } from "../../src/presentation/tui/state/reducer.ts";
import { Density } from "../../src/presentation/tui/view-models/density.ts";
import {
  fitLegend,
  summaryView,
  type LegendItem,
} from "../../src/presentation/tui/view-models/summary-view.ts";
import { buildTree, REFERENCE_DATE } from "../support/domain-builders.ts";
import { sampleAppContext, sampleWholeDiskScope } from "../support/app-context.ts";
import { reportFor, SAMPLE_HOME } from "../support/report-builder.ts";

const VIEWPORT = { columns: 110, rows: 40 };
const COMPACT_VIEWPORT = { columns: 80, rows: 18 };

const report = reportFor(
  buildTree(SAMPLE_HOME.toString(), {
    children: [
      {
        name: "Library",
        children: [
          {
            name: "Caches",
            children: [{ name: "Homebrew", ownFilesSize: ByteSize.fromGigabytes(3) }],
          },
        ],
      },
      { name: "Movies", ownFilesSize: ByteSize.fromGigabytes(2) },
    ],
  }),
);
const completed: AppEvent = {
  kind: AppEventKind.DiagnosisUpdated,
  update: { kind: DiagnosisUpdateKind.Completed, report },
};
const scanned = reduce(initialAppState(sampleAppContext), completed).state;
const press = (state: AppState, action: UserAction): AppState =>
  reduce(state, { kind: AppEventKind.ActionRequested, action }).state;

const cleanupSummary = (state: AppState, viewport = VIEWPORT, density: Density = Density.Roomy) =>
  summaryView(state, viewport, density, REFERENCE_DATE);

describe("the summary on the Cleanup tab", () => {
  test("leads with how much can be cleared safely", () => {
    const view = cleanupSummary(scanned);
    expect(view.headline).toBe("3.0 GB");
    expect(view.aside).toBe(UiCopy.summary.safeToClear);
    expect(view.headlineColor).toBe(ColorRole.safe);
  });

  test("says so plainly when nothing can be cleared", () => {
    const empty = reduce(initialAppState(sampleAppContext), {
      kind: AppEventKind.DiagnosisUpdated,
      update: {
        kind: DiagnosisUpdateKind.Completed,
        report: reportFor(buildTree(SAMPLE_HOME.toString(), { children: [] })),
      },
    }).state;
    const view = cleanupSummary(empty);
    expect(view.headline).toBe("");
    expect(view.aside).toBe(UiCopy.summary.nothingSafe);
    expect(view.bar).toEqual([]);
  });

  test("shows the scan's progress while it runs, and never claims to be finished", () => {
    const running = initialAppState(sampleAppContext);
    const view = cleanupSummary(running);
    expect(view.aside).toBe(UiCopy.scanning.starting);
    expect(view.legend).toEqual([]);
    expect(view.bar.length).toBeGreaterThan(0);
  });

  test("shows what a failed scan says in the danger colour, with no bar", () => {
    const failed = {
      ...scanned,
      scan: { status: ScanStatus.Failed, reason: "no access", findings: [] },
    } as const;
    const view = cleanupSummary(failed);
    expect(view.aside).toBe(UiCopy.scanning.failed("no access"));
    expect(view.headlineColor).toBe(ColorRole.danger);
    expect(view.bar).toEqual([]);
  });

  test("tells you the scan covered only a folder, and how to check the whole disk", () => {
    const note = cleanupSummary(scanned).note ?? "";
    expect(note).toContain("Looked at");
    expect(note).toContain("w");
  });

  test("does not offer the whole disk once it was scanned", () => {
    const wholeDisk = { ...scanned, scope: sampleWholeDiskScope };
    const note = cleanupSummary(wholeDisk).note ?? "";
    expect(note).toContain(UiCopy.summary.scopeWholeDisk("").slice(0, 20));
    expect(note).not.toContain(UiCopy.summary.checkWholeDisk("w"));
  });

  test("names the home folder in words, not with a tilde", () => {
    const note = cleanupSummary(scanned).note ?? "";
    expect(note).toContain(UiCopy.frame.scope.yourHomeFolder);
    expect(note).not.toContain("~");
  });

  test("shows the disk fact whichever tab is open, or says it is still measuring", () => {
    expect(cleanupSummary(scanned).fact).toBe(UiCopy.frame.diskUnknown);
    const measured = reduce(scanned, {
      kind: AppEventKind.VolumeMeasured,
      usage: {
        capacity: ByteSize.fromGigabytes(500),
        used: ByteSize.fromGigabytes(400),
        available: ByteSize.fromGigabytes(100),
      },
    }).state;
    for (const action of [
      UserAction.ShowCleanup,
      UserAction.BrowseFolders,
      UserAction.ShowDiskOverview,
      UserAction.ShowGrowth,
    ]) {
      expect(cleanupSummary(press(measured, action)).fact).toContain("80% full");
    }
  });

  test("keeps only the headline and bar in a short window", () => {
    const view = cleanupSummary(scanned, COMPACT_VIEWPORT, Density.Compact);
    expect(view.legend).toEqual([]);
    expect(view.note).toBeUndefined();
    expect(view.rule).toBeUndefined();
    expect(view.bar.length).toBeGreaterThan(0);
  });

  test("adds the legend and a rule at medium height, and the note only when tall", () => {
    const snug = cleanupSummary(scanned, VIEWPORT, Density.Snug);
    expect(snug.legend.length).toBeGreaterThan(0);
    expect(snug.rule).toBeDefined();
    expect(snug.note).toBeUndefined();
    expect(cleanupSummary(scanned, VIEWPORT, Density.Roomy).note).toBeDefined();
  });
});

describe("the summary on the other tabs", () => {
  test("Folders: the folder's size, with where you are as a breadcrumb", () => {
    const view = cleanupSummary(press(scanned, UserAction.BrowseFolders));
    expect(view.headline).toBe("5.0 GB");
    expect(view.aside).toBe("~");
    expect(view.legend.map((item) => item.text)).toContain("Library");
  });

  test("Disk: how much is in use", () => {
    const withLayout = [
      {
        kind: AppEventKind.VolumeMeasured,
        usage: {
          capacity: ByteSize.fromGigabytes(500),
          used: ByteSize.fromGigabytes(400),
          available: ByteSize.fromGigabytes(100),
        },
      },
      {
        kind: AppEventKind.StorageDescribed,
        layout: {
          capacity: ByteSize.fromGigabytes(500),
          free: ByteSize.fromGigabytes(100),
          localSnapshotCount: 0,
          volumes: [{ name: "Data", role: VolumeRole.Data, used: ByteSize.fromGigabytes(400) }],
        },
      },
    ].reduce<AppState>((state, event) => reduce(state, event).state, scanned);
    const view = cleanupSummary(press(withLayout, UserAction.ShowDiskOverview));
    expect(view.aside).toBe(UiCopy.summary.inUse);
  });

  test("What grew: says it is the first scan when there is nothing to compare", () => {
    const view = cleanupSummary(press(scanned, UserAction.ShowGrowth));
    expect(view.headline).toBe(UiCopy.summary.firstScan);
  });

  test("What grew: the total change and when it was measured against", () => {
    const grown = reduce(scanned, {
      kind: AppEventKind.HistoryCompared,
      diff: {
        previousTakenAt: new Date("2026-09-28T00:00:00Z"),
        total: { direction: ChangeDirection.Grew, amount: ByteSize.fromGigabytes(1) },
        grownFolders: [],
      },
    }).state;
    const view = cleanupSummary(press(grown, UserAction.ShowGrowth));
    expect(view.headline).toBe("+1.0 GB");
    expect(view.aside).toContain("since your last scan");
  });
});

describe("fitLegend", () => {
  const item = (text: string): LegendItem => ({
    text,
    value: "1 GB",
    color: ColorRole.safe,
    glyph: Glyph.barFull,
  });
  const items = [item("Safe to clear"), item("Check first"), item("Not recognized"), item("Free")];

  test("keeps everything when it fits", () => {
    expect(fitLegend(items, 200)).toEqual(items);
  });

  test("drops from the middle and keeps the last item, which is free space", () => {
    const fitted = fitLegend(items, 40);
    expect(fitted.length).toBeLessThan(items.length);
    expect(fitted.at(-1)?.text).toBe("Free");
    expect(fitted.at(0)?.text).toBe("Safe to clear");
  });

  test("never drops below one item", () => {
    expect(fitLegend(items, 1)).toHaveLength(1);
  });
});
