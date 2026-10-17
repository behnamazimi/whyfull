import { describe, expect, test } from "bun:test";
import {
  AbsolutePath,
  atPath,
  ByteSize,
  Category,
  CleanupActionKind,
  defineRule,
  OutcomeKind,
  OwnerToolId,
  PathTemplate,
  RuleId,
  runOwnerTool,
  SafetyLevel,
  summarizeCleanup,
  ToolProblem,
  type ActionResult,
  type OwnerToolAction,
} from "../../src/domain/index.ts";
import { UiCopy } from "../../src/presentation/copy/ui-copy.ts";
import { formatByteSize } from "../../src/presentation/format/byte-size-format.ts";
import { CleanupPhase, initialAppState } from "../../src/presentation/tui/state/app-state.ts";
import { ScreenKind, initialScreen } from "../../src/presentation/tui/state/screen.ts";
import {
  cleanupReportView,
  cleanupReviewView,
} from "../../src/presentation/tui/view-models/cleanup-view.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { SAMPLE_HOME } from "../support/report-builder.ts";

const ROOMY = { columns: 120, rows: 40 };
const THIRTY_GIGABYTES = ByteSize.fromGigabytes(30);
const RAW_TOOL_OUTPUT = 'xcrun: error: unable to find utility "simctl"';

const simulatorRule = defineRule({
  id: RuleId.IosSimulators,
  category: Category.DeveloperFiles,
  locator: atPath(PathTemplate.underHome("Library", "Developer", "CoreSimulator", "Devices")),
  safety: SafetyLevel.SafeViaOwnerTool,
  remedy: runOwnerTool(OwnerToolId.SimulatorCleanup),
});

const simulatorCleanup: OwnerToolAction = {
  kind: CleanupActionKind.RunOwnerTool,
  tool: OwnerToolId.SimulatorCleanup,
  paths: [AbsolutePath.fromSegments([...SAMPLE_HOME.segments, "Devices"])],
  rules: [simulatorRule],
  size: THIRTY_GIGABYTES,
};

const failedWith = (problem: ToolProblem | undefined): ActionResult => ({
  action: simulatorCleanup,
  outcome: OutcomeKind.Failed,
  freed: ByteSize.zero,
  detail: RAW_TOOL_OUTPUT,
  problem,
});

const finished = (results: readonly ActionResult[]) => ({
  ...initialAppState(sampleAppContext),
  screen: { kind: ScreenKind.CleanupReport, previous: initialScreen } as const,
  cleanup: {
    phase: CleanupPhase.Finished,
    report: summarizeCleanup(results, ByteSize.zero),
  } as const,
});

describe("the report after a failed tool", () => {
  test("says nothing was cleaned instead of claiming 0 bytes more free space", () => {
    const { summary } = cleanupReportView(finished([failedWith(ToolProblem.Unusable)]));
    expect(summary).toEqual([UiCopy.cleanup.nothingCleaned]);
  });

  test("explains a known problem in plain words, not with the tool's own output", () => {
    const { problems } = cleanupReportView(finished([failedWith(ToolProblem.Unusable)]));
    const label = problems[0]?.label ?? "";
    expect(label).toContain(UiCopy.cleanup.toolProblems[ToolProblem.Unusable]);
    expect(label).not.toContain(RAW_TOOL_OUTPUT);
  });

  test("falls back to the tool's own output when the cause is unknown", () => {
    const { problems } = cleanupReportView(finished([failedWith(undefined)]));
    expect(problems[0]?.label).toContain(RAW_TOOL_OUTPUT);
  });

  test("never suggests trying again", () => {
    const { problems } = cleanupReportView(finished([failedWith(ToolProblem.TimedOut)]));
    expect(problems[0]?.label.toLowerCase()).not.toContain("try");
  });

  test("still reports the gain when something was cleaned", () => {
    const done: ActionResult = {
      action: simulatorCleanup,
      outcome: OutcomeKind.Done,
      freed: ByteSize.fromGigabytes(2),
      detail: undefined,
    };
    const { summary } = cleanupReportView(finished([done]));
    expect(summary[0]).toBe(UiCopy.cleanup.measuredGain(formatByteSize(ByteSize.zero)));
  });
});

describe("the review of an owner tool", () => {
  test("warns what Docker's cleanup removes", () => {
    const dockerCleanup: OwnerToolAction = { ...simulatorCleanup, tool: OwnerToolId.DockerPrune };
    const reviewing = {
      ...initialAppState(sampleAppContext),
      screen: { kind: ScreenKind.CleanupReview, previous: initialScreen } as const,
      cleanup: {
        phase: CleanupPhase.Reviewing,
        plan: { actions: [dockerCleanup], blocked: [] },
        typed: "",
      } as const,
    };
    const { summary } = cleanupReviewView(reviewing, ROOMY);
    expect(summary).toContain(UiCopy.cleanup.toolNotes[OwnerToolId.DockerPrune]);
  });
});
