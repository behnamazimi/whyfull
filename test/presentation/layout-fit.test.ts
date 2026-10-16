import { describe, expect, test } from "bun:test";
import {
  AbsolutePath,
  ByteSize,
  CleanupActionKind,
  type ApprovedAction,
} from "../../src/domain/index.ts";
import { UiCopy } from "../../src/presentation/copy/ui-copy.ts";
import { ColorRole } from "../../src/presentation/theme.ts";
import { CleanupPhase, initialAppState } from "../../src/presentation/tui/state/app-state.ts";
import { ScreenKind, initialScreen } from "../../src/presentation/tui/state/screen.ts";
import { cleanupReviewView } from "../../src/presentation/tui/view-models/cleanup-view.ts";
import { diagnosisView } from "../../src/presentation/tui/view-models/diagnosis-view.ts";
import { footerView } from "../../src/presentation/tui/view-models/footer-view.ts";
import { stackedBar, truncateMiddle } from "../../src/presentation/tui/view-models/layout.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { REFERENCE_DATE } from "../support/domain-builders.ts";
import { SAMPLE_HOME } from "../support/report-builder.ts";
import { nodeModulesRule } from "../support/sample-rules.ts";

const NARROW = { columns: 80, rows: 24 };
const SHORT = { columns: 80, rows: 18 };
const ROOMY = { columns: 120, rows: 40 };
const TINY_COLUMNS = 40;
const VERY_WIDE = { columns: 200, rows: 40 };
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
    typed: "",
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
  test("lists every place of a group when there is room", () => {
    const view = cleanupReviewView(reviewing(PLACE_COUNT), ROOMY);
    expect(view.groups).toHaveLength(1);
    expect(view.groups[0]?.places.length).toBeLessThan(PLACE_COUNT);
    expect(view.groups[0]?.morePlaces).toBeDefined();
    expect(view.hiddenGroups).toBeUndefined();
  });

  test("keeps the explanation and shows only a few places when the window is short", () => {
    const view = cleanupReviewView(reviewing(PLACE_COUNT), SHORT);
    expect(view.groups).toHaveLength(1);
    expect(view.groups[0]?.consequence).toBe(UiCopy.cleanup.consequences.delete);
    expect(view.groups[0]?.places.length).toBeLessThan(PLACE_COUNT);
  });

  test("never lets a target run wider than the window", () => {
    const view = cleanupReviewView(reviewing(PLACE_COUNT), NARROW);
    for (const place of view.groups.flatMap((group) => group.places)) {
      expect(place.target.length).toBeLessThan(NARROW.columns);
    }
  });
});

describe("footer in a narrow window", () => {
  const rowWidth = (row: readonly { readonly key: string; readonly label: string }[]) =>
    row.reduce((sum, item) => sum + item.key.length + 1 + item.label.length, 0);

  test("keeps one row when every hint fits", () => {
    const { hintRows } = footerView(initialAppState(sampleAppContext), VERY_WIDE);
    expect(hintRows).toHaveLength(1);
  });

  test("wraps onto a second row instead of hiding hints", () => {
    const state = initialAppState(sampleAppContext);
    const wide = footerView(state, VERY_WIDE).hintRows.flat();
    const narrow = footerView(state, NARROW).hintRows;
    expect(narrow).toHaveLength(2);
    expect(narrow.flat().map((item) => item.key)).toEqual(wide.map((item) => item.key));
    for (const row of narrow) expect(rowWidth(row)).toBeLessThan(NARROW.columns);
  });

  test("drops only optional hints when two rows aren't enough", () => {
    const state = initialAppState(sampleAppContext);
    const tiny = footerView(state, { columns: TINY_COLUMNS, rows: NARROW.rows }).hintRows;
    expect(tiny.length).toBeLessThanOrEqual(2);
    expect(tiny.flat().some((item) => item.key === "q")).toBe(true);
  });
});

describe("main screen in a wide window", () => {
  test("shows the selected finding beside the list", () => {
    const view = diagnosisView(initialAppState(sampleAppContext), 0, ROOMY, REFERENCE_DATE);
    expect(view.sidePane).toBeDefined();
  });

  test("keeps the single list when the window is narrow", () => {
    const view = diagnosisView(initialAppState(sampleAppContext), 0, NARROW, REFERENCE_DATE);
    expect(view.sidePane).toBeUndefined();
  });
});

describe("stackedBar", () => {
  const BAR_WIDTH = 30;
  const colors = [ColorRole.accent, ColorRole.caution, ColorRole.safe] as const;

  test("fills the width exactly and keeps tiny shares visible", () => {
    const segments = stackedBar(
      [
        { share: 0.001, color: colors[0] },
        { share: 0.9, color: colors[1] },
        { share: 0.099, color: colors[2] },
      ],
      BAR_WIDTH,
    );
    const cells = segments.reduce((sum, segment) => sum + segment.text.length, 0);
    expect(cells).toBe(BAR_WIDTH);
    expect(segments).toHaveLength(colors.length);
  });

  test("draws nothing when there is nothing to draw", () => {
    expect(stackedBar([{ share: 0, color: colors[0] }], BAR_WIDTH)).toEqual([]);
  });
});
