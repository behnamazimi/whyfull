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
  summaryView,
  type SummaryView,
} from "../../src/presentation/tui/view-models/summary-view.ts";
import { buildTree, REFERENCE_DATE } from "../support/domain-builders.ts";
import { sampleAppContext, sampleWholeDiskScope } from "../support/app-context.ts";
import { reportFor, SAMPLE_HOME } from "../support/report-builder.ts";

const VIEWPORT = { columns: 110, rows: 40 };
const COMPACT_VIEWPORT = { columns: 80, rows: 18 };
const CAPACITY_GB = 500;
const USED_GB = 400;
const AVAILABLE_GB = 100;
const HOMEBREW_GB = 3;
const INSTALLER_GB = 2;

const gigabytes = (amount: number): ByteSize => ByteSize.fromGigabytes(amount);

const report = reportFor(
  buildTree(SAMPLE_HOME.toString(), {
    children: [
      {
        name: "Library",
        children: [
          {
            name: "Caches",
            children: [{ name: "Homebrew", ownFilesSize: gigabytes(HOMEBREW_GB) }],
          },
        ],
      },
      { name: "Movies", ownFilesSize: gigabytes(2) },
      { name: "Downloads", notableFiles: [{ name: "app.dmg", size: gigabytes(INSTALLER_GB) }] },
    ],
  }),
);
const completed: AppEvent = {
  kind: AppEventKind.DiagnosisUpdated,
  update: { kind: DiagnosisUpdateKind.Completed, report },
};
const measuredDisk: AppEvent = {
  kind: AppEventKind.VolumeMeasured,
  usage: {
    capacity: gigabytes(CAPACITY_GB),
    used: gigabytes(USED_GB),
    available: gigabytes(AVAILABLE_GB),
  },
};
const scanned = reduce(initialAppState(sampleAppContext), completed).state;
const measured = reduce(scanned, measuredDisk).state;
const press = (state: AppState, action: UserAction): AppState =>
  reduce(state, { kind: AppEventKind.ActionRequested, action }).state;

const summary = (state: AppState, viewport = VIEWPORT, density: Density = Density.Roomy) =>
  summaryView(state, viewport, density, REFERENCE_DATE);

const textOf = (parts: readonly { readonly text: string }[]): string =>
  parts.map((part) => part.text).join("");

const heading = (view: SummaryView): string => textOf(view.heading);

describe("the summary on the Cleanup tab", () => {
  test("leads with how full the disk is, coloured by how worried to be", () => {
    const view = summary(measured);
    expect(heading(view)).toBe(`${UiCopy.summary.diskIs}80% full`);
    expect(view.heading.at(-1)?.color).toBe(ColorRole.caution);
    expect(view.fact).toBe(UiCopy.summary.freeOf("100 GB", "500 GB"));
  });

  test("says it is still measuring while it doesn't know the disk yet", () => {
    const view = summary(scanned);
    expect(heading(view)).toBe(UiCopy.frame.diskUnknown);
    expect(view.bar).toEqual([]);
  });

  test("shows the scan's progress while it runs, and never claims to be finished", () => {
    const view = summary(initialAppState(sampleAppContext));
    expect(heading(view)).toBe(UiCopy.scanning.starting);
    expect(view.tail).toEqual([]);
    expect(view.bar.length).toBeGreaterThan(0);
  });

  test("shows what a failed scan says, with no bar", () => {
    const failed = {
      ...measured,
      scan: { status: ScanStatus.Failed, reason: "no access", findings: [] },
    } as const;
    const view = summary(failed);
    expect(heading(view)).toBe(UiCopy.scanning.failed("no access"));
    expect(view.bar).toEqual([]);
  });

  test("asks you to pick items until something is selected", () => {
    expect(textOf(summary(measured).tail)).toBe(UiCopy.summary.pickToSeeGain);
  });

  test("says how much free space the cleanup would give", () => {
    const picked = press(measured, UserAction.SelectAllSafe);
    const tail = summary(picked).tail;
    expect(textOf(tail)).toBe(UiCopy.summary.afterCleanup("103 GB"));
    expect(tail[0]?.color).toBe(ColorRole.safe);
    expect(summary(picked).bar.some((segment) => segment.text.includes(Glyph.barDense))).toBe(true);
  });

  test("keeps what goes to the Trash apart, since it frees nothing until the Trash is emptied", () => {
    const onChecks = [UserAction.MoveDown, UserAction.MoveDown].reduce(press, measured);
    const picked = press(onChecks, UserAction.ToggleCleanup);
    const tail = textOf(summary(picked).tail);
    expect(picked.cart.size).toBeGreaterThan(0);
    expect(tail).toContain(UiCopy.summary.afterTrash("2.0 GB"));
    expect(tail).not.toContain(UiCopy.summary.afterCleanup(""));
  });

  test("tells you the scan covered only a folder, and how to check the whole disk", () => {
    const note = summary(scanned).note ?? "";
    expect(note).toContain("Looked at");
    expect(note).toContain("w");
  });

  test("does not offer the whole disk once it was scanned", () => {
    const wholeDisk = { ...scanned, scope: sampleWholeDiskScope };
    const note = summary(wholeDisk).note ?? "";
    expect(note).toContain(UiCopy.summary.scopeWholeDisk("").slice(0, 20));
    expect(note).not.toContain(UiCopy.summary.checkWholeDisk("w"));
  });

  test("names the home folder in words, not with a tilde", () => {
    const note = summary(scanned).note ?? "";
    expect(note).toContain(UiCopy.frame.scope.yourHomeFolder);
    expect(note).not.toContain("~");
  });

  test("keeps only the heading and bar in a short window", () => {
    const view = summary(measured, COMPACT_VIEWPORT, Density.Compact);
    expect(view.note).toBeUndefined();
    expect(view.rule).toBeUndefined();
    expect(view.bar.length).toBeGreaterThan(0);
  });

  test("adds a rule at medium height, and the note only when tall", () => {
    const snug = summary(measured, VIEWPORT, Density.Snug);
    expect(snug.rule).toBeDefined();
    expect(snug.note).toBeUndefined();
    expect(summary(measured, VIEWPORT, Density.Roomy).note).toBeDefined();
  });
});

describe("the summary on the other tabs", () => {
  test("Folders: where you are as a breadcrumb, and the folder's size", () => {
    const view = summary(press(measured, UserAction.BrowseFolders));
    expect(heading(view)).toBe("~");
    expect(view.fact).toBe(UiCopy.summary.inThisFolder("7.0 GB"));
    expect(view.note).toBe(UiCopy.summary.foldersNote);
  });

  test("Folders: the bar's part under the cursor takes the cursor's colour", () => {
    const view = summary(press(measured, UserAction.BrowseFolders));
    expect(view.bar.filter((segment) => segment.color === ColorRole.accent)).toHaveLength(1);
    const next = summary(press(press(measured, UserAction.BrowseFolders), UserAction.MoveDown));
    expect(next.bar[0]?.color).not.toBe(ColorRole.accent);
    expect(next.bar[1]?.color).toBe(ColorRole.accent);
  });

  const withLayout = [
    measuredDisk,
    {
      kind: AppEventKind.StorageDescribed,
      layout: {
        capacity: gigabytes(CAPACITY_GB),
        free: gigabytes(AVAILABLE_GB),
        localSnapshotCount: 0,
        volumes: [{ name: "Data", role: VolumeRole.Data, used: gigabytes(USED_GB) }],
      },
    } satisfies AppEvent,
  ].reduce<AppState>((state, event) => reduce(state, event).state, scanned);

  test("Disk: how much is used, drawn in textures so the parts differ without colour", () => {
    const view = summary(press(withLayout, UserAction.ShowDiskOverview));
    expect(heading(view)).toBe(UiCopy.overview.title);
    expect(view.fact).toBe(UiCopy.summary.usedOf("400 GB", "500 GB"));
    const glyphs = new Set(view.bar.map((segment) => segment.text.charAt(0)));
    expect(glyphs.size).toBeGreaterThan(1);
  });

  test("Disk: sends you to the item-by-item view for the scanned folder", () => {
    const view = summary(press(withLayout, UserAction.ShowDiskOverview));
    expect(view.note).toBe(UiCopy.summary.diskNote("1"));
  });

  test("What grew: says it is the first scan when there is nothing to compare", () => {
    const view = summary(press(measured, UserAction.ShowGrowth));
    expect(heading(view)).toBe(UiCopy.summary.firstScan);
  });

  test("What grew: the total change, when it was measured against, and how many folders", () => {
    const grown = reduce(measured, {
      kind: AppEventKind.HistoryCompared,
      diff: {
        previousTakenAt: new Date("2026-09-28T00:00:00Z"),
        total: { direction: ChangeDirection.Grew, amount: gigabytes(1) },
        grownFolders: [],
      },
    }).state;
    const view = summary(press(grown, UserAction.ShowGrowth));
    expect(heading(view)).toContain("+1.0 GB");
    expect(heading(view)).toContain("since your last scan");
    expect(view.fact).toBe(UiCopy.summary.foldersGrew(0));
  });
});
