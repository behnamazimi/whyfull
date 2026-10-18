import { describe, expect, test } from "bun:test";
import { DiagnosisUpdateKind } from "../../src/application/index.ts";
import {
  atPath,
  ByteSize,
  Category,
  defineRule,
  explainOnly,
  FindingKind,
  PathTemplate,
  RuleId,
  SafetyLevel,
  type KnownItemFinding,
  type UnexplainedFolderFinding,
} from "../../src/domain/index.ts";
import { ruleCopy } from "../../src/presentation/copy/rule-copy.ts";
import { whoCleansUp } from "../../src/presentation/copy/rule-labels.ts";
import { UiCopy } from "../../src/presentation/copy/ui-copy.ts";
import { UserAction } from "../../src/presentation/keymap.ts";
import { AppEventKind } from "../../src/presentation/tui/state/app-event.ts";
import { initialAppState, type AppState } from "../../src/presentation/tui/state/app-state.ts";
import { reduce } from "../../src/presentation/tui/state/reducer.ts";
import { folderAt, folderEntries } from "../../src/presentation/tui/state/selectors.ts";
import { findingPaneView } from "../../src/presentation/tui/view-models/finding-pane-view.ts";
import { folderPaneView } from "../../src/presentation/tui/view-models/folder-pane-view.ts";
import { buildTree, REFERENCE_DATE } from "../support/domain-builders.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { reportFor, SAMPLE_HOME } from "../support/report-builder.ts";

const report = reportFor(
  buildTree(SAMPLE_HOME.toString(), {
    children: [
      {
        name: "app",
        markers: ["package.json"],
        children: [{ name: "node_modules", ownFilesSize: ByteSize.fromMegabytes(300) }],
      },
      { name: "Movies", ownFilesSize: ByteSize.fromGigabytes(2) },
    ],
  }),
);
const scanned = reduce(initialAppState(sampleAppContext), {
  kind: AppEventKind.DiagnosisUpdated,
  update: { kind: DiagnosisUpdateKind.Completed, report },
}).state;

const known = report.findings.find(
  (finding): finding is KnownItemFinding => finding.kind === FindingKind.KnownItem,
);
const unrecognized = report.findings.find(
  (finding): finding is UnexplainedFolderFinding => finding.kind === FindingKind.UnexplainedFolder,
);
if (known === undefined || unrecognized === undefined) throw new Error("sample needs both kinds");

const photosRule = defineRule({
  id: RuleId.PhotosLibrary,
  category: Category.PhotosAndMessages,
  locator: atPath(PathTemplate.underHome("Pictures", "Photos Library.photoslibrary")),
  safety: SafetyLevel.Protected,
  remedy: explainOnly(),
});
const photos: KnownItemFinding = {
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

const press = (state: AppState, action: UserAction): AppState =>
  reduce(state, { kind: AppEventKind.ActionRequested, action }).state;
const actionsOf = (actions: readonly { readonly action: UserAction }[]): readonly UserAction[] =>
  actions.map((item) => item.action);

describe("the detail pane for a recognized item", () => {
  test("explains it, says who cleans it, and offers to add it", () => {
    const pane = findingPaneView(scanned, known, REFERENCE_DATE);
    expect(pane.title).toBe(ruleCopy[known.rule.id].title);
    expect(pane.sections.map((section) => section.label)).toEqual([
      UiCopy.detail.whatItIs,
      UiCopy.detail.ifRemoved,
    ]);
    expect(pane.notes.map((note) => note.text)).toContain(whoCleansUp(known.rule));
    expect(actionsOf(pane.actions)).toEqual([UserAction.Open, UserAction.ToggleCleanup]);
    expect(pane.actions.at(-1)?.label).toBe(UiCopy.detail.add);
  });

  test("shows the technical name only here, never as the title", () => {
    const pane = findingPaneView(scanned, known, REFERENCE_DATE);
    expect(pane.meta).toContain("node_modules");
    expect(pane.title).not.toContain("node_modules");
  });

  test("marks the action as done, and says how to take it out, once it is selected", () => {
    const picked = press(scanned, UserAction.ToggleCleanup);
    const toggle = findingPaneView(picked, known, REFERENCE_DATE).actions.at(-1);
    expect(toggle?.active).toBe(true);
    expect(toggle?.label).toBe(UiCopy.detail.inCleanup);
  });

  test("has no way to add an item that whyfull never changes", () => {
    const pane = findingPaneView(scanned, photos, REFERENCE_DATE);
    expect(actionsOf(pane.actions)).not.toContain(UserAction.ToggleCleanup);
    expect(pane.notes.map((note) => note.text)).toContain(whoCleansUp(photosRule));
  });
});

describe("the detail pane for a folder whyfull does not recognize", () => {
  test("offers to ask an AI assistant, and no way to add it until high-risk mode is on", () => {
    const pane = findingPaneView(scanned, unrecognized, REFERENCE_DATE);
    expect(actionsOf(pane.actions)).toContain(UserAction.AskAssistant);
    expect(actionsOf(pane.actions)).not.toContain(UserAction.ToggleCleanup);
    expect(pane.verdict).toBe(UiCopy.highRisk.detail.notRecognized);
  });

  test("offers to add it, for good, once high-risk mode is on", () => {
    const risky = { ...scanned, highRiskMode: true };
    const pane = findingPaneView(risky, unrecognized, REFERENCE_DATE);
    expect(pane.actions.at(-1)).toMatchObject({
      action: UserAction.ToggleCleanup,
      label: UiCopy.detail.addForGood,
    });
  });
});

describe("the detail pane for a folder in the Folders tab", () => {
  const entryNamed = (name: string) => {
    const folder = folderAt(scanned, SAMPLE_HOME);
    const entry =
      folder === undefined
        ? undefined
        : folderEntries(scanned, folder).find((candidate) => candidate.path.name === name);
    if (entry === undefined) throw new Error(`No entry named ${name}`);
    return entry;
  };

  test("lets you look inside a folder and ask about it", () => {
    const pane = folderPaneView(scanned, entryNamed("Movies"), REFERENCE_DATE);
    expect(actionsOf(pane.actions)).toEqual([
      UserAction.Open,
      UserAction.AskAssistant,
      UserAction.RevealInFinder,
    ]);
  });

  test("offers to add a recognized folder that whyfull can clean", () => {
    const pane = folderPaneView(scanned, entryNamed("app"), REFERENCE_DATE);
    expect(actionsOf(pane.actions)).toContain(UserAction.Open);
    expect(pane.notes.map((note) => note.text).join(" ")).toContain("safe to clean");
  });
});
