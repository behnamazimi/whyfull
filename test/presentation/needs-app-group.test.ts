import { describe, expect, test } from "bun:test";
import { DiagnosisUpdateKind, type DiagnosisReport } from "../../src/application/index.ts";
import {
  atPath,
  ByteSize,
  Category,
  classify,
  defaultDiagnosisPolicy,
  defineRule,
  deleteRegenerable,
  diagnose,
  FindingGroup,
  findingGroup,
  PathTemplate,
  RuleId,
  RuleIndex,
  SafetyLevel,
  type DirectoryNode,
} from "../../src/domain/index.ts";
import { UiCopy } from "../../src/presentation/copy/ui-copy.ts";
import { UserAction } from "../../src/presentation/keymap.ts";
import { AppEventKind } from "../../src/presentation/tui/state/app-event.ts";
import { initialAppState } from "../../src/presentation/tui/state/app-state.ts";
import { reduce } from "../../src/presentation/tui/state/reducer.ts";
import { diagnosisView } from "../../src/presentation/tui/view-models/diagnosis-view.ts";
import { bodyLayout } from "../../src/presentation/tui/view-models/body-view.ts";
import { Layout, rowTitleWidth } from "../../src/presentation/tui/view-models/layout.ts";
import { ListEntryKind } from "../../src/presentation/tui/view-models/list-row.ts";
import { Density } from "../../src/presentation/tui/view-models/density.ts";
import { summaryView } from "../../src/presentation/tui/view-models/summary-view.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { buildTree, REFERENCE_DATE } from "../support/domain-builders.ts";
import { SAMPLE_HOME } from "../support/report-builder.ts";
import { homebrewOwnerToolRule } from "../support/sample-rules.ts";

const SAFE_GB = 2;
const TOOL_GB = 5;
const ROOMY = { columns: 100, rows: 30 };
const CAPACITY_GB = 500;
const USED_GB = 400;
const FREE_GB = 100;

const scratchRule = defineRule({
  id: RuleId.GradleCaches,
  category: Category.DeveloperFiles,
  locator: atPath(PathTemplate.underHome("Scratch")),
  safety: SafetyLevel.Regenerable,
  remedy: deleteRegenerable(),
});

const home = buildTree(SAMPLE_HOME.toString(), {
  children: [
    { name: "Scratch", ownFilesSize: ByteSize.fromGigabytes(SAFE_GB) },
    {
      name: "Library",
      children: [
        {
          name: "Caches",
          children: [{ name: "Homebrew", ownFilesSize: ByteSize.fromGigabytes(TOOL_GB) }],
        },
      ],
    },
  ],
});

function reportOf(root: DirectoryNode): DiagnosisReport {
  const index = RuleIndex.build([scratchRule, homebrewOwnerToolRule], { home: SAMPLE_HOME });
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

const report = reportOf(home);
const scanned = reduce(initialAppState(sampleAppContext), {
  kind: AppEventKind.DiagnosisUpdated,
  update: { kind: DiagnosisUpdateKind.Completed, report },
}).state;

describe("items that need their app's own tool", () => {
  test("form their own group, apart from the ones whyfull can clear itself", () => {
    expect(report.findings.map(findingGroup)).toEqual([FindingGroup.Safe, FindingGroup.NeedsApp]);
  });

  test("are said apart from the space a cleanup frees right away", () => {
    const measured = reduce(scanned, {
      kind: AppEventKind.VolumeMeasured,
      usage: {
        capacity: ByteSize.fromGigabytes(CAPACITY_GB),
        used: ByteSize.fromGigabytes(USED_GB),
        available: ByteSize.fromGigabytes(FREE_GB),
      },
    }).state;
    const onTool = [UserAction.MoveDown, UserAction.MoveDown].reduce(
      (state, action) => reduce(state, { kind: AppEventKind.ActionRequested, action }).state,
      measured,
    );
    const picked = reduce(onTool, {
      kind: AppEventKind.ActionRequested,
      action: UserAction.ToggleCleanup,
    }).state;
    const tail = summaryView(picked, ROOMY, Density.Roomy, REFERENCE_DATE)
      .tail.map((part) => part.text)
      .join("");
    expect(tail).toContain(UiCopy.summary.moreWithTools("5.0 GB"));
    expect(tail).not.toContain(UiCopy.summary.afterCleanup(""));
  });

  test("are not picked by select all safe", () => {
    const picked = reduce(scanned, {
      kind: AppEventKind.ActionRequested,
      action: UserAction.SelectAllSafe,
    }).state;
    expect([...picked.cart.keys()]).toEqual(["/Users/sam/Scratch"]);
  });
});

describe("the rows", () => {
  const MOST_COLUMNS = 140;
  const FEWEST_COLUMNS = 80;

  test("always fit the list, with the chip column only beside a pane", () => {
    for (let columns = FEWEST_COLUMNS; columns <= MOST_COLUMNS; columns += 1) {
      const viewport = { columns, rows: 30 };
      const view = diagnosisView(scanned, 1, viewport, REFERENCE_DATE);
      const list = view.pane === undefined ? viewport : bodyLayout(viewport).list;
      for (const entry of view.entries) {
        if (entry.kind !== ListEntryKind.Row) continue;
        expect(entry.title.length).toBeLessThanOrEqual(
          rowTitleWidth(list, view.pane !== undefined),
        );
        expect(entry.chip.length).toBe(view.pane === undefined ? 0 : Layout.chipColumnWidth);
      }
    }
  });
});
