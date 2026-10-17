import { describe, expect, test } from "bun:test";
import { DiagnosisUpdateKind } from "../../src/application/index.ts";
import {
  ByteSize,
  FindingKind,
  KnownFolderId,
  type UnexplainedFolderFinding,
} from "../../src/domain/index.ts";
import { folderCopy } from "../../src/presentation/copy/folder-copy.ts";
import { UiCopy } from "../../src/presentation/copy/ui-copy.ts";
import { AppEventKind } from "../../src/presentation/tui/state/app-event.ts";
import { initialAppState } from "../../src/presentation/tui/state/app-state.ts";
import { reduce } from "../../src/presentation/tui/state/reducer.ts";
import { folderAt, folderEntries } from "../../src/presentation/tui/state/selectors.ts";
import { findingPaneView } from "../../src/presentation/tui/view-models/finding-pane-view.ts";
import { folderPaneView } from "../../src/presentation/tui/view-models/folder-pane-view.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { buildTree, REFERENCE_DATE } from "../support/domain-builders.ts";
import { reportFor, SAMPLE_HOME } from "../support/report-builder.ts";

const LIBRARY_SIZE_GIGABYTES = 2;
const DOWNLOADS_SIZE_MEGABYTES = 500;

const report = reportFor(
  buildTree(SAMPLE_HOME.toString(), {
    children: [
      { name: "Library", ownFilesSize: ByteSize.fromGigabytes(LIBRARY_SIZE_GIGABYTES) },
      { name: "Downloads", ownFilesSize: ByteSize.fromMegabytes(DOWNLOADS_SIZE_MEGABYTES) },
      { name: "Movies", ownFilesSize: ByteSize.fromGigabytes(LIBRARY_SIZE_GIGABYTES) },
    ],
  }),
);
const state = reduce(initialAppState(sampleAppContext), {
  kind: AppEventKind.DiagnosisUpdated,
  update: { kind: DiagnosisUpdateKind.Completed, report },
}).state;

const unexplained = (name: string): UnexplainedFolderFinding => {
  const finding = report.findings.find(
    (candidate) => candidate.kind === FindingKind.UnexplainedFolder && candidate.path.name === name,
  );
  if (finding?.kind !== FindingKind.UnexplainedFolder) throw new Error(`No finding for ${name}`);
  return finding;
};

describe("folder explanations", () => {
  test("explains a known folder in the same labelled sections a recognized item has", () => {
    const view = findingPaneView(state, unexplained("Library"), REFERENCE_DATE);
    const copy = folderCopy[KnownFolderId.Library];
    expect(view.sections.map((section) => section.label)).toEqual([
      UiCopy.detail.whatItIs,
      UiCopy.detail.ifRemoved,
    ]);
    expect(view.sections.flatMap((section) => section.lines.map((line) => line.text))).toEqual([
      copy.whatItIs,
      copy.ifRemoved,
    ]);
    expect(view.notes.map((line) => line.text)).not.toContain(copy.whatItIs);
  });

  test("adds no sections for a folder it has no explanation for", () => {
    expect(findingPaneView(state, unexplained("Movies"), REFERENCE_DATE).sections).toEqual([]);
  });

  test("labels known folders in the detail pane and calls others plain folders", () => {
    const verdictOf = (name: string): string | undefined => {
      const folder = folderAt(state, SAMPLE_HOME);
      const entry =
        folder === undefined
          ? undefined
          : folderEntries(state, folder).find((candidate) => candidate.path.name === name);
      return entry === undefined ? undefined : folderPaneView(state, entry, REFERENCE_DATE).verdict;
    };
    expect(verdictOf("Downloads")).toBe(folderCopy[KnownFolderId.Downloads].label);
    expect(verdictOf("Movies")).toBe(UiCopy.tree.folderTag);
  });
});
