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
import { foldersView } from "../../src/presentation/tui/view-models/folders-view.ts";
import { ListEntryKind } from "../../src/presentation/tui/view-models/list-row.ts";
import { unrecognizedDetailView } from "../../src/presentation/tui/view-models/unrecognized-detail-view.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { buildTree, REFERENCE_DATE } from "../support/domain-builders.ts";
import { reportFor, SAMPLE_HOME } from "../support/report-builder.ts";

const ROOMY = { columns: 120, rows: 40 };
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
  test("explains a known folder in the side pane before the high-risk facts", () => {
    const texts = unrecognizedDetailView(state, unexplained("Library"), REFERENCE_DATE).lines.map(
      (line) => line.text,
    );
    const copy = folderCopy[KnownFolderId.Library];
    expect(texts.slice(0, 4)).toEqual([
      UiCopy.detail.whatItIs,
      copy.whatItIs,
      UiCopy.detail.ifRemoved,
      copy.ifRemoved,
    ]);
  });

  test("adds nothing for a folder it has no explanation for", () => {
    const texts = unrecognizedDetailView(state, unexplained("Movies"), REFERENCE_DATE).lines.map(
      (line) => line.text,
    );
    expect(texts).not.toContain(UiCopy.detail.whatItIs);
  });

  test("labels known folders in the browse list and leaves others blank", () => {
    const tagOf = (name: string): string | undefined => {
      const row = foldersView(state, SAMPLE_HOME, 0, ROOMY, REFERENCE_DATE).entries.find(
        (entry) => entry.kind === ListEntryKind.Row && entry.title.startsWith(name),
      );
      return row?.kind === ListEntryKind.Row ? row.tag : undefined;
    };
    expect(tagOf("Downloads")).toBe(folderCopy[KnownFolderId.Downloads].label);
    expect(tagOf("Movies")).toBe("");
  });
});
