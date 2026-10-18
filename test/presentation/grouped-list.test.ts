import { describe, expect, test } from "bun:test";
import { DiagnosisUpdateKind } from "../../src/application/index.ts";
import { ByteSize, FindingGroup } from "../../src/domain/index.ts";
import { UiCopy } from "../../src/presentation/copy/ui-copy.ts";
import { UserAction } from "../../src/presentation/keymap.ts";
import { AppEventKind, type AppEvent } from "../../src/presentation/tui/state/app-event.ts";
import { initialAppState } from "../../src/presentation/tui/state/app-state.ts";
import { NavKind, navigationOf } from "../../src/presentation/tui/state/navigation.ts";
import { reduce } from "../../src/presentation/tui/state/reducer.ts";
import { Density } from "../../src/presentation/tui/view-models/density.ts";
import { diagnosisView } from "../../src/presentation/tui/view-models/diagnosis-view.ts";
import { windowEntries } from "../../src/presentation/tui/view-models/grouped-window.ts";
import { ListEntryKind } from "../../src/presentation/tui/view-models/list-row.ts";
import { summaryView } from "../../src/presentation/tui/view-models/summary-view.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { buildTree, REFERENCE_DATE } from "../support/domain-builders.ts";
import { reportFor, SAMPLE_HOME } from "../support/report-builder.ts";

const ROOMY = { columns: 100, rows: 30 };
const HOMEBREW_GB = 3;
const MOVIE_MB = 600;

const home = buildTree(SAMPLE_HOME.toString(), {
  children: [
    {
      name: "Library",
      children: [
        {
          name: "Caches",
          children: [{ name: "Homebrew", ownFilesSize: ByteSize.fromGigabytes(HOMEBREW_GB) }],
        },
      ],
    },
    {
      name: "Movies",
      children: [
        { name: "trip", ownFilesSize: ByteSize.fromMegabytes(MOVIE_MB) },
        { name: "wedding", ownFilesSize: ByteSize.fromMegabytes(MOVIE_MB) },
      ],
    },
  ],
});
const completed: AppEvent = {
  kind: AppEventKind.DiagnosisUpdated,
  update: { kind: DiagnosisUpdateKind.Completed, report: reportFor(home) },
};
const ready = reduce(initialAppState(sampleAppContext), completed).state;
const press = (state: typeof ready, action: UserAction) =>
  reduce(state, { kind: AppEventKind.ActionRequested, action }).state;
const moveDown = (state: typeof ready, times: number) =>
  Array.from({ length: times }).reduce<typeof ready>(
    (current) => press(current, UserAction.MoveDown),
    state,
  );

const onlyUnrecognized = reduce(initialAppState(sampleAppContext), {
  kind: AppEventKind.DiagnosisUpdated,
  update: {
    kind: DiagnosisUpdateKind.Completed,
    report: reportFor(
      buildTree(SAMPLE_HOME.toString(), {
        children: [
          {
            name: "Movies",
            children: [
              { name: "trip", ownFilesSize: ByteSize.fromMegabytes(MOVIE_MB) },
              { name: "wedding", ownFilesSize: ByteSize.fromMegabytes(MOVIE_MB) },
            ],
          },
        ],
      }),
    ),
  },
}).state;

describe("the grouped findings list", () => {
  test("puts a header before each group, and the cursor stops on headers too", () => {
    const view = diagnosisView(ready, 0, ROOMY, REFERENCE_DATE);
    const headers = view.entries.filter((entry) => entry.kind === ListEntryKind.Header);
    expect(headers.map((header) => header.title)).toEqual([
      UiCopy.groups[FindingGroup.Safe].title,
      UiCopy.groups[FindingGroup.Unrecognized].title,
    ]);
    expect(view.entries.map((entry) => entry.index)).toEqual([0, 1, 2]);
    expect(navigationOf(ready).map((item) => item.kind)).toEqual([
      NavKind.Group,
      NavKind.Finding,
      NavKind.Group,
    ]);
  });

  test("starts with the groups that have nothing to do folded away", () => {
    const view = diagnosisView(ready, 0, ROOMY, REFERENCE_DATE);
    const folded = view.entries.filter(
      (entry) => entry.kind === ListEntryKind.Header && entry.folded,
    );
    expect(folded.map((header) => header.title)).toEqual([
      UiCopy.groups[FindingGroup.Unrecognized].title,
    ]);
    const titles = view.entries.map((entry) => entry.title);
    expect(titles).not.toContain("Movies");
  });

  test("enter on a folded header opens the group, and again folds it", () => {
    const onHeader = moveDown(ready, 2);
    const opened = press(onHeader, UserAction.Open);
    expect(opened.collapsedGroups.has(FindingGroup.Unrecognized)).toBe(false);
    expect(navigationOf(opened)).toHaveLength(4);
    expect(opened.screen).toMatchObject({ selected: 2 });
    const folded = press(opened, UserAction.Open);
    expect(folded.collapsedGroups.has(FindingGroup.Unrecognized)).toBe(true);
    expect(navigationOf(folded)).toHaveLength(3);
  });

  test("a group that is all there is stays open", () => {
    expect(navigationOf(onlyUnrecognized).map((item) => item.kind)).toEqual([
      NavKind.Group,
      NavKind.Finding,
    ]);
  });

  test("space on a header adds everything cleanable in the group, and again takes it out", () => {
    const added = press(ready, UserAction.ToggleCleanup);
    expect(added.cart.size).toBe(1);
    expect(press(added, UserAction.ToggleCleanup).cart.size).toBe(0);
  });

  test("space on a group nothing can be cleaned from does nothing", () => {
    const onHeader = moveDown(ready, 2);
    expect(press(onHeader, UserAction.ToggleCleanup).cart.size).toBe(0);
  });

  test("shows the disk's fullness in the summary heading", () => {
    const measured = reduce(ready, {
      kind: AppEventKind.VolumeMeasured,
      usage: {
        capacity: ByteSize.fromGigabytes(HOMEBREW_GB * 10),
        used: ByteSize.fromGigabytes(HOMEBREW_GB * 8),
        available: ByteSize.fromGigabytes(HOMEBREW_GB * 2),
      },
    }).state;
    const summary = summaryView(measured, ROOMY, Density.Roomy, REFERENCE_DATE);
    expect(summary.heading.map((part) => part.text).join("")).toContain("80% full");
  });
});

describe("scrolling over headers and rows", () => {
  const entries = [
    { kind: ListEntryKind.Header },
    { kind: ListEntryKind.Row },
    { kind: ListEntryKind.Row },
    { kind: ListEntryKind.Header },
    { kind: ListEntryKind.Row },
    { kind: ListEntryKind.Row },
  ];

  test("scrolls over headers like rows, since the cursor stops on both", () => {
    const window = windowEntries(entries, 3, 2);
    expect(window.end - window.start).toBe(2);
    expect(window.start).toBeLessThanOrEqual(3);
    expect(window.end).toBeGreaterThan(3);
  });

  test("counts hidden rows, not hidden headers", () => {
    const window = windowEntries(entries, 0, 3);
    expect(window.hiddenAbove).toBe(0);
    expect(window.hiddenBelow).toBe(2);
  });
});
