import { describe, expect, test } from "bun:test";
import { DiagnosisUpdateKind } from "../../src/application/index.ts";
import { ByteSize, FindingGroup, findingGroup } from "../../src/domain/index.ts";
import { UiCopy } from "../../src/presentation/copy/ui-copy.ts";
import { UserAction } from "../../src/presentation/keymap.ts";
import { AppEventKind, type AppEvent } from "../../src/presentation/tui/state/app-event.ts";
import { initialAppState } from "../../src/presentation/tui/state/app-state.ts";
import { FindingFilter } from "../../src/presentation/tui/state/finding-filter.ts";
import { reduce } from "../../src/presentation/tui/state/reducer.ts";
import { findingsOf } from "../../src/presentation/tui/state/selectors.ts";
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
const pressTab = (state: typeof ready) =>
  reduce(state, { kind: AppEventKind.ActionRequested, action: UserAction.CycleFilter }).state;

describe("the grouped findings list", () => {
  test("puts a header before each group and leaves headers out of the cursor order", () => {
    const view = diagnosisView(ready, 0, ROOMY, REFERENCE_DATE);
    const headers = view.entries.filter((entry) => entry.kind === ListEntryKind.Header);
    expect(headers.map((header) => header.title)).toEqual([
      UiCopy.groups[FindingGroup.Safe].title,
      UiCopy.groups[FindingGroup.Unrecognized].title,
    ]);
    const indices = view.entries.flatMap((entry) =>
      entry.kind === ListEntryKind.Row ? [entry.index] : [],
    );
    expect(indices).toEqual([0, 1]);
  });

  test("says how much can be cleared safely in the summary headline", () => {
    const summary = summaryView(ready, ROOMY, Density.Roomy, REFERENCE_DATE);
    expect(summary.headline).toContain("3.0 GB");
    expect(summary.aside).toBe(UiCopy.summary.safeToClear);
  });

  test("offers a chip per group with its size, and marks the active one", () => {
    const { chips } = diagnosisView(ready, 0, ROOMY, REFERENCE_DATE);
    expect(chips.map((chip) => chip.filter)).toEqual([
      FindingFilter.All,
      FindingFilter.Safe,
      FindingFilter.Unrecognized,
    ]);
    expect(chips.filter((chip) => chip.active).map((chip) => chip.filter)).toEqual([
      FindingFilter.All,
    ]);
  });

  test("tab cycles through the filters and wraps back to all", () => {
    const safe = pressTab(ready);
    expect(safe.findingFilter).toBe(FindingFilter.Safe);
    expect(findingsOf(safe).every((finding) => findingGroup(finding) === FindingGroup.Safe)).toBe(
      true,
    );
    const unrecognized = pressTab(safe);
    expect(unrecognized.findingFilter).toBe(FindingFilter.Unrecognized);
    expect(pressTab(unrecognized).findingFilter).toBe(FindingFilter.All);
  });

  test("changing the filter puts the cursor back on the first row", () => {
    const moved = reduce(ready, {
      kind: AppEventKind.ActionRequested,
      action: UserAction.MoveDown,
    }).state;
    expect(pressTab(moved).screen).toMatchObject({ selected: 0 });
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

  test("a window never starts on the first row of a group without its header", () => {
    const window = windowEntries(entries, 4, 3);
    expect(entries[window.start]?.kind).toBe(ListEntryKind.Header);
  });

  test("counts hidden rows, not hidden headers", () => {
    const window = windowEntries(entries, 0, 3);
    expect(window.hiddenAbove).toBe(0);
    expect(window.hiddenBelow).toBe(2);
  });
});
