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
import { Layout } from "../../src/presentation/tui/view-models/layout.ts";
import { Density } from "../../src/presentation/tui/view-models/density.ts";
import { summaryView } from "../../src/presentation/tui/view-models/summary-view.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { buildTree, REFERENCE_DATE } from "../support/domain-builders.ts";
import { SAMPLE_HOME } from "../support/report-builder.ts";
import { homebrewOwnerToolRule } from "../support/sample-rules.ts";

const SAFE_GB = 2;
const TOOL_GB = 5;
const ROOMY = { columns: 100, rows: 30 };

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

  test("stay out of the headline and are named beside it", () => {
    const view = summaryView(scanned, ROOMY, Density.Roomy, REFERENCE_DATE);
    expect(view.headline).toBe("2.0 GB");
    expect(view.aside).toContain(UiCopy.summary.moreWithTools("5.0 GB"));
  });

  test("are not picked by select all safe", () => {
    const picked = reduce(scanned, {
      kind: AppEventKind.ActionRequested,
      action: UserAction.SelectAllSafe,
    }).state;
    expect([...picked.cart.keys()]).toEqual(["/Users/sam/Scratch"]);
  });
});

describe("the filter chips", () => {
  const MOST_COLUMNS = 140;
  const FEWEST_COLUMNS = 80;
  const PADDING = 2;
  const widthOf = (view: ReturnType<typeof diagnosisView>): number =>
    PADDING +
    view.chips.reduce(
      (total, chip) =>
        total + chip.label.length + (chip.size === "" ? 0 : chip.size.length + 1) + 3,
      0,
    ) +
    (view.filterHint === undefined ? 0 : view.filterHint.length + 1);

  test("always fit on their one line, giving up sizes and then the hint", () => {
    for (let columns = FEWEST_COLUMNS; columns <= MOST_COLUMNS; columns += 1) {
      const view = diagnosisView(scanned, 0, { columns, rows: 30 }, REFERENCE_DATE);
      const listColumns = view.pane === undefined ? columns : columns - Layout.detailPaneColumns;
      expect(widthOf(view)).toBeLessThanOrEqual(listColumns);
    }
  });
});
