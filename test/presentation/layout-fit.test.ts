import { describe, expect, test } from "bun:test";
import {
  AbsolutePath,
  ByteSize,
  CleanupActionKind,
  type ApprovedAction,
} from "../../src/domain/index.ts";
import { CleanupPhase, initialAppState } from "../../src/presentation/tui/state/app-state.ts";
import { ScreenKind, initialScreen } from "../../src/presentation/tui/state/screen.ts";
import { cleanupReviewView } from "../../src/presentation/tui/view-models/cleanup-view.ts";
import { footerView } from "../../src/presentation/tui/view-models/footer-view.ts";
import { truncateMiddle } from "../../src/presentation/tui/view-models/layout.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { SAMPLE_HOME } from "../support/report-builder.ts";
import { nodeModulesRule } from "../support/sample-rules.ts";

const NARROW = { columns: 80, rows: 24 };
const SHORT = { columns: 80, rows: 18 };
const ROOMY = { columns: 120, rows: 40 };
const PLACE_COUNT = 10;
const DEVICE = 1;
const FIRST_INODE = 100;

const pathAction = (index: number): ApprovedAction => ({
  kind: CleanupActionKind.Delete,
  path: AbsolutePath.fromSegments([...SAMPLE_HOME.segments, `project-${String(index)}`, ".next"]),
  rule: nodeModulesRule,
  size: ByteSize.fromMegabytes(index + 1),
  identity: { device: DEVICE, inode: FIRST_INODE + index, isSymbolicLink: false },
});

const reviewing = (count: number) => ({
  ...initialAppState(sampleAppContext),
  screen: { kind: ScreenKind.CleanupReview, previous: initialScreen } as const,
  cleanup: {
    phase: CleanupPhase.Reviewing,
    plan: { actions: Array.from({ length: count }, (_, index) => pathAction(index)), blocked: [] },
  } as const,
});

describe("truncateMiddle", () => {
  test("keeps both ends of a long path", () => {
    const result = truncateMiddle("~/projects/lobyas/apps/web/.next", 16);
    expect(result).toHaveLength(16);
    expect(result.startsWith("~/proje")).toBe(true);
    expect(result.endsWith("/.next")).toBe(true);
    expect(result.includes("…")).toBe(true);
  });

  test("leaves short text alone", () => {
    expect(truncateMiddle("~/a/.next", 40)).toBe("~/a/.next");
  });
});

describe("cleanup review that does not fit the window", () => {
  test("shows two lines per row when there is room", () => {
    const view = cleanupReviewView(reviewing(PLACE_COUNT), ROOMY);
    expect(view.compact).toBe(false);
    expect(view.rows).toHaveLength(PLACE_COUNT);
    expect(view.hiddenRows).toBeUndefined();
  });

  test("switches to one line per row, and says how many are not shown, when it is short", () => {
    const view = cleanupReviewView(reviewing(PLACE_COUNT), SHORT);
    expect(view.compact).toBe(true);
    expect(view.rows.length).toBeLessThan(PLACE_COUNT);
    expect(view.hiddenRows).toBeDefined();
  });

  test("never lets a target run wider than the window", () => {
    const view = cleanupReviewView(reviewing(PLACE_COUNT), NARROW);
    for (const row of view.rows) expect(row.target.length).toBeLessThan(NARROW.columns);
  });
});

describe("footer in a narrow window", () => {
  test("keeps the essential hints and fits on one line", () => {
    const state = initialAppState(sampleAppContext);
    const wide = footerView(state, ROOMY).hints;
    const narrow = footerView(state, NARROW).hints;
    const width = narrow.reduce((sum, item) => sum + item.key.length + 1 + item.label.length, 0);
    expect(narrow.length).toBeLessThan(wide.length);
    expect(width).toBeLessThan(NARROW.columns);
    expect(narrow.some((item) => item.key === "q")).toBe(true);
  });
});
