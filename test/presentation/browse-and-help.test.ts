import { describe, expect, test } from "bun:test";
import { DiagnosisUpdateKind } from "../../src/application/index.ts";
import { ByteSize, safeSizeInside } from "../../src/domain/index.ts";
import { UiCopy } from "../../src/presentation/copy/ui-copy.ts";
import { keyLabel, UserAction } from "../../src/presentation/keymap.ts";
import { AppEventKind, type AppEvent } from "../../src/presentation/tui/state/app-event.ts";
import { initialAppState } from "../../src/presentation/tui/state/app-state.ts";
import { reduce } from "../../src/presentation/tui/state/reducer.ts";
import { ListEntryKind } from "../../src/presentation/tui/view-models/list-row.ts";
import { foldersView } from "../../src/presentation/tui/view-models/folders-view.ts";
import {
  helpKeys,
  helpLineCount,
  HelpLineKind,
  helpView,
} from "../../src/presentation/tui/view-models/simple-views.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { buildTree, pathOf, REFERENCE_DATE } from "../support/domain-builders.ts";
import { reportFor, SAMPLE_HOME } from "../support/report-builder.ts";

const ROOMY = { columns: 120, rows: 40 };

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
const tagOf = (name: string): string | undefined => {
  const entry = foldersView(state, SAMPLE_HOME, 0, ROOMY, REFERENCE_DATE).entries.find(
    (row) => row.kind === ListEntryKind.Row && row.title.startsWith(name),
  );
  return entry?.kind === ListEntryKind.Row ? entry.tag : undefined;
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
  test("says a folder contains safe items and gives plain folders no label", () => {
    expect(tagOf("app")).toContain("safe to clean");
    expect(tagOf("Movies")).toBe("");
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
