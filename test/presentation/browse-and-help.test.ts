import { describe, expect, test } from "bun:test";
import { DiagnosisUpdateKind } from "../../src/application/index.ts";
import { ByteSize, safeSizeInside } from "../../src/domain/index.ts";
import { UiCopy } from "../../src/presentation/copy/ui-copy.ts";
import { keyLabel, UserAction } from "../../src/presentation/keymap.ts";
import { AppEventKind, type AppEvent } from "../../src/presentation/tui/state/app-event.ts";
import { initialAppState } from "../../src/presentation/tui/state/app-state.ts";
import { reduce } from "../../src/presentation/tui/state/reducer.ts";
import { folderAt, folderEntries } from "../../src/presentation/tui/state/selectors.ts";
import { folderPaneView } from "../../src/presentation/tui/view-models/folder-pane-view.ts";
import {
  helpKeys,
  helpLineCount,
  HelpLineKind,
  helpView,
} from "../../src/presentation/tui/view-models/simple-views.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { buildTree, pathOf, REFERENCE_DATE } from "../support/domain-builders.ts";
import { reportFor, SAMPLE_HOME } from "../support/report-builder.ts";

const report = reportFor(
  buildTree(SAMPLE_HOME.toString(), {
    children: [
      {
        name: "app",
        markers: ["package.json"],
        children: [{ name: "node_modules", ownFilesSize: ByteSize.fromMegabytes(300) }],
      },
      { name: "Movies", ownFilesSize: ByteSize.fromMegabytes(600) },
    ],
  }),
);

const completed: AppEvent = {
  kind: AppEventKind.DiagnosisUpdated,
  update: { kind: DiagnosisUpdateKind.Completed, report },
};
const state = reduce(initialAppState(sampleAppContext), completed).state;
const notesOf = (name: string): readonly string[] => {
  const folder = folderAt(state, SAMPLE_HOME);
  const entry =
    folder === undefined
      ? undefined
      : folderEntries(state, folder).find((candidate) => candidate.path.name === name);
  if (entry === undefined) throw new Error(`No folder named ${name}`);
  return folderPaneView(state, entry, REFERENCE_DATE).notes.map((note) => note.text);
};

describe("safeSizeInside", () => {
  test("counts only safe recognized items inside the folder", () => {
    const { classifications } = report.classification;
    expect(safeSizeInside(classifications, pathOf("/Users/sam/app")).bytes).toBe(
      ByteSize.fromMegabytes(300).bytes,
    );
    expect(safeSizeInside(classifications, pathOf("/Users/sam/Movies")).isZero()).toBe(true);
  });
});

describe("browse folders labels", () => {
  test("says in the detail pane that a folder contains safe items, and nothing for plain folders", () => {
    expect(notesOf("app").join(" ")).toContain("safe to clean");
    expect(notesOf("Movies").join(" ")).not.toContain("safe to clean");
  });
});

describe("help", () => {
  test("groups every key once, and folds the paired arrows onto one row", () => {
    const keys = helpKeys();
    expect(keys.map((hint) => hint.key)).toContain(
      `${keyLabel[UserAction.MoveUp]} ${keyLabel[UserAction.MoveDown]}`,
    );
    expect(keys.map((hint) => hint.label)).toContain(UiCopy.actions[UserAction.FixPermissions]);
    expect(new Set(keys.map((hint) => hint.key)).size).toBe(keys.length);
  });

  test("scrolls so the last line can be reached in a short window", () => {
    const short = { columns: 80, rows: 18 };
    const lastLine = helpView(Number.MAX_SAFE_INTEGER, short).lines.at(-1);
    expect(helpView(0, short).lines.length).toBeLessThan(helpLineCount());
    expect(helpView(0, short).lines).not.toContainEqual(lastLine);
    expect(lastLine?.kind).toBe(HelpLineKind.KeyRow);
  });
});
