import { describe, expect, test } from "bun:test";
import { DiagnosisUpdateKind } from "../../src/application/index.ts";
import { ByteSize, FindingKind } from "../../src/domain/index.ts";
import { UiCopy } from "../../src/presentation/copy/ui-copy.ts";
import { UserAction } from "../../src/presentation/keymap.ts";
import { AppEventKind, EffectKind } from "../../src/presentation/tui/state/app-event.ts";
import { initialAppState } from "../../src/presentation/tui/state/app-state.ts";
import { reduce } from "../../src/presentation/tui/state/reducer.ts";
import { diagnosisView } from "../../src/presentation/tui/view-models/diagnosis-view.ts";
import { foldersView } from "../../src/presentation/tui/view-models/folders-view.ts";
import { ListEntryKind, type ListRow } from "../../src/presentation/tui/view-models/list-row.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { buildTree, REFERENCE_DATE } from "../support/domain-builders.ts";
import { reportFor, SAMPLE_HOME } from "../support/report-builder.ts";

const VIEWPORT = { columns: 100, rows: 30 };
const BIG_FOLDER_GB = 2;

const home = buildTree(SAMPLE_HOME.toString(), {
  children: [
    { name: "Library", ownFilesSize: ByteSize.fromGigabytes(BIG_FOLDER_GB) },
    { name: "Movies", ownFilesSize: ByteSize.fromGigabytes(BIG_FOLDER_GB) },
  ],
});
const report = reportFor(home);
const scanned = reduce(initialAppState(sampleAppContext), {
  kind: AppEventKind.DiagnosisUpdated,
  update: { kind: DiagnosisUpdateKind.Completed, report },
}).state;

const rowsOf = (entries: readonly { readonly kind: string }[]): readonly ListRow[] =>
  entries.filter((entry): entry is ListRow => entry.kind === ListEntryKind.Row);

describe("rows that lead nowhere", () => {
  test("have no checkbox in the main list when high-risk mode must refuse them", () => {
    const view = diagnosisView(scanned, 0, VIEWPORT, REFERENCE_DATE);
    const selectable = new Map(
      rowsOf(view.entries).map((row) => [row.title, row.selectable] as const),
    );
    expect(selectable.get("~/Library")).toBe(false);
    expect(selectable.get("~/Movies")).toBe(true);
  });

  test("have no checkbox in Folders either, and the pane says why", () => {
    const view = foldersView(scanned, SAMPLE_HOME, 0, VIEWPORT, REFERENCE_DATE);
    const library = rowsOf(view.entries).find((row) => row.title === "Library");
    expect(library?.selectable).toBe(false);
    expect(rowsOf(view.entries).find((row) => row.title === "Movies")?.selectable).toBe(true);
  });

  test("show the folder's place in the home folder, so two folders with one name differ", () => {
    const titles = rowsOf(diagnosisView(scanned, 0, VIEWPORT, REFERENCE_DATE).entries).map(
      (row) => row.title,
    );
    expect(titles).toContain("~/Movies");
  });

  test("the Folders note no longer promises the Trash", () => {
    expect(UiCopy.summary.foldersNote).not.toContain("Trash");
  });
});

describe("show in Finder", () => {
  test("asks to show the chosen item's place", () => {
    const finding = scanned.scan.findings[0];
    const result = reduce(scanned, {
      kind: AppEventKind.ActionRequested,
      action: UserAction.RevealInFinder,
    });
    const [effect] = result.effects;
    if (effect?.kind !== EffectKind.RevealInFinder) throw new Error("expected a reveal effect");
    if (finding?.kind !== FindingKind.UnexplainedFolder) throw new Error("expected a folder");
    expect(effect.path).toEqual(finding.path);
  });

  test("says so when Finder could not be opened", () => {
    const failed = reduce(scanned, { kind: AppEventKind.RevealFailed, reason: "no Finder" });
    expect(failed.state.notice).toBe(UiCopy.notices.revealFailed("no Finder"));
  });
});
