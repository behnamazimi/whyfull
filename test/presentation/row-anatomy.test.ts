import { describe, expect, test } from "bun:test";
import { DiagnosisUpdateKind, type DiagnosisReport } from "../../src/application/index.ts";
import {
  atPath,
  ByteSize,
  Category,
  ChangeDirection,
  classify,
  defaultDiagnosisPolicy,
  defineRule,
  deleteRegenerable,
  diagnose,
  PathTemplate,
  RuleId,
  RuleIndex,
  SafetyLevel,
  VolumeRole,
  type DirectoryNode,
} from "../../src/domain/index.ts";
import { ruleCopy } from "../../src/presentation/copy/rule-copy.ts";
import { UiCopy } from "../../src/presentation/copy/ui-copy.ts";
import { UserAction } from "../../src/presentation/keymap.ts";
import { Glyph } from "../../src/presentation/theme.ts";
import { AppEventKind, type AppEvent } from "../../src/presentation/tui/state/app-event.ts";
import { initialAppState, type AppState } from "../../src/presentation/tui/state/app-state.ts";
import { reduce } from "../../src/presentation/tui/state/reducer.ts";
import { bodyLayout, stripOf } from "../../src/presentation/tui/view-models/body-view.ts";
import { diagnosisView } from "../../src/presentation/tui/view-models/diagnosis-view.ts";
import { diskOverviewView } from "../../src/presentation/tui/view-models/disk-overview-view.ts";
import { foldersView } from "../../src/presentation/tui/view-models/folders-view.ts";
import { growthView } from "../../src/presentation/tui/view-models/growth-view.ts";
import { ListEntryKind } from "../../src/presentation/tui/view-models/list-row.ts";
import { tabsView } from "../../src/presentation/tui/view-models/tabs-view.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { buildTree, REFERENCE_DATE } from "../support/domain-builders.ts";
import { SAMPLE_HOME } from "../support/report-builder.ts";
import { homebrewOwnerToolRule, installersRule } from "../support/sample-rules.ts";

const SAFE_ICON = "●";
const WIDE = { columns: 120, rows: 40 };
const NARROW = { columns: 90, rows: 40 };
const OPEN_APP = "Gradle";
const SCRATCH_GB = 2;
const TOOL_GB = 5;
const INSTALLER_GB = 3;
const MOVIE_MB = 600;
const CAPACITY_GB = 500;
const USED_GB = 400;
const FREE_GB = 100;
const OPERATING_SYSTEM_GB = 12;

const scratchRule = defineRule({
  id: RuleId.GradleCaches,
  category: Category.DeveloperFiles,
  locator: atPath(PathTemplate.underHome("Scratch")),
  safety: SafetyLevel.Regenerable,
  remedy: deleteRegenerable(),
  ownerApps: [OPEN_APP],
});

function reportOf(root: DirectoryNode): DiagnosisReport {
  const index = RuleIndex.build([scratchRule, installersRule, homebrewOwnerToolRule], {
    home: SAMPLE_HOME,
  });
  if (!index.ok) throw new Error("rules must be unique");
  const classification = classify(root, index.value);
  return {
    snapshot: { root, issues: [], startedAt: REFERENCE_DATE, finishedAt: REFERENCE_DATE },
    classification,
    findings: diagnose({
      root,
      classification,
      policy: defaultDiagnosisPolicy,
      now: REFERENCE_DATE,
    }),
  };
}

const home = buildTree(SAMPLE_HOME.toString(), {
  children: [
    { name: "Scratch", ownFilesSize: ByteSize.fromGigabytes(SCRATCH_GB) },
    {
      name: "Downloads",
      notableFiles: [{ name: "setup.dmg", size: ByteSize.fromGigabytes(INSTALLER_GB) }],
    },
    {
      name: "Library",
      children: [
        {
          name: "Caches",
          children: [{ name: "Homebrew", ownFilesSize: ByteSize.fromGigabytes(TOOL_GB) }],
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

const events: readonly AppEvent[] = [
  {
    kind: AppEventKind.DiagnosisUpdated,
    update: { kind: DiagnosisUpdateKind.Completed, report: reportOf(home) },
  },
  {
    kind: AppEventKind.VolumeMeasured,
    usage: {
      capacity: ByteSize.fromGigabytes(CAPACITY_GB),
      used: ByteSize.fromGigabytes(USED_GB),
      available: ByteSize.fromGigabytes(FREE_GB),
    },
  },
  {
    kind: AppEventKind.StorageDescribed,
    layout: {
      capacity: ByteSize.fromGigabytes(CAPACITY_GB),
      free: ByteSize.fromGigabytes(FREE_GB),
      localSnapshotCount: 1,
      volumes: [
        {
          name: "Macintosh HD",
          role: VolumeRole.System,
          used: ByteSize.fromGigabytes(OPERATING_SYSTEM_GB),
        },
        {
          name: "Data",
          role: VolumeRole.Data,
          used: ByteSize.fromGigabytes(USED_GB - OPERATING_SYSTEM_GB),
        },
      ],
    },
  },
  { kind: AppEventKind.RunningAppsChecked, apps: new Set([OPEN_APP]) },
];
const scanned = events.reduce<AppState>(
  (state, event) => reduce(state, event).state,
  initialAppState(sampleAppContext),
);

const press = (state: AppState, ...actions: readonly UserAction[]): AppState =>
  actions.reduce(
    (current, action) => reduce(current, { kind: AppEventKind.ActionRequested, action }).state,
    state,
  );

// The list is: Safe header, Scratch, Needs-its-app header, Homebrew, Check header, installers,
// then the folded Not-recognized header.
const SCRATCH_ROW = 1;
const HOMEBREW_ROW = 3;
const CHECK_HEADER = 4;
const INSTALLERS_ROW = 5;
const UNRECOGNIZED_HEADER = 6;
const rowsOf = (state: AppState, viewport = WIDE, selected = SCRATCH_ROW) =>
  diagnosisView(state, selected, viewport, REFERENCE_DATE).entries.flatMap((entry) =>
    entry.kind === ListEntryKind.Row ? [entry] : [],
  );
const at = (state: AppState, selected: number, viewport = WIDE) =>
  diagnosisView(state, selected, viewport, REFERENCE_DATE);

describe("the chip beside each Cleanup row", () => {
  test("says what happens to it, and warns when its app is open", () => {
    const rows = rowsOf(scanned);
    expect(rows.map((row) => row.chip.trim())).toEqual([
      UiCopy.chips.quitApp(OPEN_APP),
      UiCopy.chips.viaTool[ownerToolOf()],
      UiCopy.chips.toTrash,
    ]);
  });

  test("leaves a plain delete without a chip once its app is closed", () => {
    const closed = reduce(scanned, {
      kind: AppEventKind.RunningAppsChecked,
      apps: new Set(),
    }).state;
    expect(rowsOf(closed)[0]?.chip.trim()).toBe("");
  });

  test("is left out when the window has no pane for it to sit beside", () => {
    expect(rowsOf(scanned, NARROW).every((row) => row.chip === "")).toBe(true);
  });
});

function ownerToolOf() {
  const remedy = homebrewOwnerToolRule.remedy;
  if (remedy.kind !== "run-owner-tool") throw new Error("expected an owner tool rule");
  return remedy.tool;
}

describe("what the pane lists under 'Before you start'", () => {
  test("puts an open app first, as something still to do", () => {
    const checks = at(scanned, SCRATCH_ROW).pane?.checks ?? [];
    expect(checks[0]).toMatchObject({ mark: Glyph.blocked, text: UiCopy.detail.appOpen(OPEN_APP) });
    expect(checks.some((check) => check.text === UiCopy.checks.deletes)).toBe(true);
  });

  test("doesn't claim an app's tool is ready, since it is only checked at review", () => {
    const checks = at(scanned, HOMEBREW_ROW).pane?.checks ?? [];
    expect(checks).toHaveLength(1);
    expect(checks[0]?.text).toBe(UiCopy.checks.toolOnReview(UiCopy.ownerToolNames[ownerToolOf()]));
    expect(checks[0]?.mark).not.toBe(Glyph.done);
  });

  test("says that a Trash item can be put back", () => {
    const checks = at(scanned, INSTALLERS_ROW).pane?.checks ?? [];
    expect(checks.map((check) => check.text)).toEqual([UiCopy.checks.toTrash]);
  });
});

describe("the strip under a narrow list", () => {
  test("names the chosen row, says if it is safe, then gives the first thing to do", () => {
    const { strip } = at(scanned, SCRATCH_ROW, NARROW);
    expect(strip).toHaveLength(3);
    expect(strip[0]?.text).toContain(ruleCopy[RuleId.GradleCaches].title);
    expect(strip[0]?.text).toContain("2.0 GB");
    expect(strip[1]?.text).toContain(UiCopy.status.remove);
    expect(strip[2]?.text.startsWith(Glyph.blocked)).toBe(true);
  });

  test("cuts every line to the width of the list", () => {
    const view = at(scanned, SCRATCH_ROW, NARROW);
    for (const line of view.strip) {
      expect(line.text.length).toBeLessThanOrEqual(NARROW.columns);
    }
    expect(stripOf(undefined, bodyLayout(NARROW).list)).toEqual([]);
  });
});

describe("the pane for a group's header", () => {
  const actionsOf = (selected: number) =>
    (at(scanned, selected).pane?.actions ?? []).map((item) => item.action);

  test("offers to fold the group, and to add all of it when it can be cleaned", () => {
    expect(actionsOf(0)).toEqual([UserAction.Open, UserAction.ToggleCleanup]);
    expect(actionsOf(CHECK_HEADER)).toEqual([UserAction.Open, UserAction.ToggleCleanup]);
  });

  test("only offers to open a group whyfull can't clean anything from", () => {
    expect(actionsOf(UNRECOGNIZED_HEADER)).toEqual([UserAction.Open]);
  });

  test("changes its words once everything in the group is in the cleanup", () => {
    const added = press(scanned, UserAction.MoveUp, UserAction.ToggleCleanup);
    expect(at(added, 0).pane?.actions.at(-1)?.label).toBe(UiCopy.groupPane.clearAll);
  });
});

describe("the Cleanup tab's count", () => {
  test("shows how many items are selected, wherever they were chosen", () => {
    const picked = press(scanned, UserAction.ToggleCleanup);
    const badge = (state: AppState): string =>
      tabsView(state, WIDE, undefined).tabs[0]?.badge ?? "";
    expect(badge(scanned)).toBe("");
    expect(badge(picked)).toBe(UiCopy.frame.cartCount(1));
  });
});

describe("the Folders tab's chips", () => {
  test("give a verdict to what whyfull recognizes", () => {
    const view = foldersView(scanned, SAMPLE_HOME, 0, WIDE, REFERENCE_DATE);
    const scratch = view.entries.find(
      (entry) => entry.kind === ListEntryKind.Row && entry.title === "Scratch",
    );
    expect(scratch?.kind === ListEntryKind.Row && scratch.chip.trim()).toBe(
      `${SAFE_ICON} ${UiCopy.tags.safeToRemove}`,
    );
  });
});

describe("the Disk tab", () => {
  const onDisk = (selected: number) => diskOverviewView(scanned, selected, WIDE);
  const FIRST_ROW = 0;
  const SECOND_ROW = 1;
  const THIRD_ROW = 2;

  test("sends the scanned folder to Cleanup, and says nothing about snapshots there", () => {
    const pane = onDisk(FIRST_ROW).pane;
    expect(pane?.notes).toEqual([]);
    expect(pane?.actions.map((item) => item.action)).toEqual([UserAction.ShowCleanup]);
  });

  test("keeps the notes and actions about unread space under the space not looked through", () => {
    const pane = onDisk(SECOND_ROW).pane;
    expect(pane?.notes.map((note) => note.text)).toEqual([UiCopy.overview.snapshots(1)]);
    expect(pane?.actions.map((item) => item.action)).toEqual([UserAction.ScanWholeDisk]);
  });

  test("says nothing extra on the other rows", () => {
    const pane = onDisk(THIRD_ROW).pane;
    expect(pane?.notes).toEqual([]);
    expect(pane?.actions).toEqual([]);
  });

  test("shows each part's share of the disk in the chip, in the texture its bar uses", () => {
    const first = onDisk(FIRST_ROW).entries[0];
    expect(first?.kind === ListEntryKind.Row && first.icon).toBe(Glyph.barFull);
    expect(first?.kind === ListEntryKind.Row && first.chip.trim()).toBe(
      UiCopy.chips.shareOfDisk("2%"),
    );
  });
});

describe("the What grew tab", () => {
  const scratchPath = SAMPLE_HOME.child("Scratch");
  const moviesPath = SAMPLE_HOME.child("Movies");
  const grown = (path: typeof scratchPath) => ({
    path,
    before: ByteSize.fromGigabytes(1),
    after: ByteSize.fromGigabytes(SCRATCH_GB),
    growth: ByteSize.fromGigabytes(1),
  });
  const withGrowth = reduce(scanned, {
    kind: AppEventKind.HistoryCompared,
    diff: {
      previousTakenAt: REFERENCE_DATE,
      total: { direction: ChangeDirection.Grew, amount: ByteSize.fromGigabytes(2) },
      grownFolders: [grown(scratchPath), grown(moviesPath)],
    },
  }).state;
  const onGrowth = press(withGrowth, UserAction.ShowGrowth);

  test("lets what whyfull recognizes join the cleanup, and nothing else", () => {
    const rows = growthView(onGrowth, 0, WIDE).entries.flatMap((entry) =>
      entry.kind === ListEntryKind.Row ? [entry] : [],
    );
    expect(rows.map((row) => row.selectable)).toEqual([true, false]);
    expect(rows[0]?.chip.trim()).toBe(UiCopy.growth.was("1.0 GB"));
  });

  test("adds the recognized folder with space, and does nothing on the other", () => {
    const added = press(onGrowth, UserAction.ToggleCleanup);
    expect([...added.cart.keys()]).toEqual([scratchPath.toString()]);
    const onMovies = press(onGrowth, UserAction.MoveDown, UserAction.ToggleCleanup);
    expect(onMovies.cart.size).toBe(0);
  });

  test("explains the tab in its pane when there is nothing to show", () => {
    const first = press(scanned, UserAction.ShowGrowth);
    const pane = growthView(first, 0, WIDE).pane;
    expect(pane?.sections[0]?.lines[0]?.text).toBe(UiCopy.growth.howItWorks);
  });
});
