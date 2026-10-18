import { describe, expect, test } from "bun:test";
import { DiagnosisUpdateKind } from "../../src/application/index.ts";
import {
  ByteSize,
  Category,
  defineRule,
  explainOnly,
  FindingKind,
  atPath,
  PathTemplate,
  RuleId,
  SafetyLevel,
  type FindingGroup,
  type KnownItemFinding,
} from "../../src/domain/index.ts";
import { UiCopy } from "../../src/presentation/copy/ui-copy.ts";
import { UserAction } from "../../src/presentation/keymap.ts";
import { AppEventKind, type AppEvent } from "../../src/presentation/tui/state/app-event.ts";
import { initialAppState, type AppState } from "../../src/presentation/tui/state/app-state.ts";
import { reduce } from "../../src/presentation/tui/state/reducer.ts";
import { ScreenKind } from "../../src/presentation/tui/state/screen.ts";
import { diagnosisView } from "../../src/presentation/tui/view-models/diagnosis-view.ts";
import { ListEntryKind } from "../../src/presentation/tui/view-models/list-row.ts";
import { buildTree, REFERENCE_DATE } from "../support/domain-builders.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { reportFor, SAMPLE_HOME } from "../support/report-builder.ts";

const VIEWPORT = { columns: 100, rows: 30 };

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
    { name: "Movies", ownFilesSize: ByteSize.fromGigabytes(2) },
  ],
});
const report = reportFor(home);

const press = (state: AppState, userAction: UserAction): AppState =>
  reduce(state, { kind: AppEventKind.ActionRequested, action: userAction }).state;

const completed: AppEvent = {
  kind: AppEventKind.DiagnosisUpdated,
  update: { kind: DiagnosisUpdateKind.Completed, report },
};
const scanned = reduce(initialAppState(sampleAppContext), completed).state;

const photosRule = defineRule({
  id: RuleId.PhotosLibrary,
  category: Category.PhotosAndMessages,
  locator: atPath(PathTemplate.underHome("Pictures", "Photos Library.photoslibrary")),
  safety: SafetyLevel.Protected,
  remedy: explainOnly(),
});
const photosFinding: KnownItemFinding = {
  kind: FindingKind.KnownItem,
  rule: photosRule,
  size: ByteSize.fromGigabytes(9),
  staleSize: ByteSize.zero,
  lastModified: REFERENCE_DATE,
  locations: [
    {
      rule: photosRule,
      path: SAMPLE_HOME.child("Pictures").child("Photos Library.photoslibrary"),
      size: ByteSize.fromGigabytes(9),
      lastModified: REFERENCE_DATE,
    },
  ],
};

describe("select all safe", () => {
  test("adds every safe item and nothing else, and says how much", () => {
    const state = press(scanned, UserAction.SelectAllSafe);
    const safePaths = report.findings
      .filter((finding) => finding.kind === FindingKind.KnownItem)
      .flatMap((finding) => finding.locations.map((location) => location.path.toString()));
    expect([...state.cart.keys()].toSorted()).toEqual(safePaths.toSorted());
    expect(state.notice).toContain("safe item");
  });

  test("does nothing the second time", () => {
    const once = press(scanned, UserAction.SelectAllSafe);
    const twice = press(once, UserAction.SelectAllSafe);
    expect([...twice.cart.keys()]).toEqual([...once.cart.keys()]);
  });

  test("says so when there is nothing safe to select yet", () => {
    const state = press(initialAppState(sampleAppContext), UserAction.SelectAllSafe);
    expect(state.cart.size).toBe(0);
    expect(state.notice).toBe(UiCopy.notices.nothingSafeYet);
  });

  test("works on what the scan has found so far, and review opens from it", () => {
    const running = reduce(initialAppState(sampleAppContext), {
      kind: AppEventKind.DiagnosisUpdated,
      update: { kind: DiagnosisUpdateKind.PreliminaryFindings, report },
    }).state;
    const selected = press(running, UserAction.SelectAllSafe);
    expect(selected.cart.size).toBeGreaterThan(0);
    expect(press(selected, UserAction.ReviewCleanup).screen.kind).toBe(ScreenKind.CleanupReview);
  });

  test("never adds items whyfull never changes", () => {
    const withPhotos = {
      ...scanned,
      scan: { ...scanned.scan, findings: [...scanned.scan.findings, photosFinding] },
    };
    const state = press(withPhotos, UserAction.SelectAllSafe);
    const photosPath = photosFinding.locations[0]?.path.toString() ?? "";
    expect(state.cart.has(photosPath)).toBe(false);
  });

  test("shows protected items without a checkbox, so they can't look selectable", () => {
    const withPhotos = {
      ...scanned,
      collapsedGroups: new Set<FindingGroup>(),
      scan: { ...scanned.scan, findings: [...scanned.scan.findings, photosFinding] },
    };
    const view = diagnosisView(withPhotos, 0, VIEWPORT, REFERENCE_DATE);
    const rows = view.entries.filter((entry) => entry.kind === ListEntryKind.Row);
    const protectedRow = rows.find((row) => row.title === "Photos library");
    expect(protectedRow?.selectable).toBe(false);
    expect(rows.filter((row) => row.selectable).length).toBeGreaterThan(0);
  });
});
