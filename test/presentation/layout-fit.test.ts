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
import { keyStripView } from "../../src/presentation/tui/view-models/key-strip-view.ts";
import {
  Layout,
  stackedBar,
  truncateMiddle,
} from "../../src/presentation/tui/view-models/layout.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { buildTree, REFERENCE_DATE } from "../support/domain-builders.ts";
import { reportFor, SAMPLE_HOME } from "../support/report-builder.ts";
import { nodeModulesRule } from "../support/sample-rules.ts";

const NARROW = { columns: 80, rows: 24 };
/** What a dialog has inside its border in a short window: the window less the frame's margin and the box. */
const SHORT_DIALOG = { columns: 74, rows: 15 };
const NARROW_DIALOG = { columns: 74, rows: 21 };
const ROOMY_DIALOG = { columns: 114, rows: 37 };
const ROOMY = { columns: 120, rows: 40 };
const TINY_COLUMNS = 40;
const VERY_WIDE = { columns: 200, rows: 40 };
const PLACE_COUNT = 10;
const DEVICE = 1;
const scannedFindings = reportFor(
  buildTree(SAMPLE_HOME.toString(), {
    children: [
      {
        name: "app",
        markers: ["package.json"],
        children: [{ name: "node_modules", ownFilesSize: ByteSize.fromMegabytes(300) }],
      },
    ],
  }),
).findings;
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
    const view = cleanupReviewView(reviewing(PLACE_COUNT), ROOMY_DIALOG);
    const items = view.sections.flatMap((section) => section.items);
    expect(items).toHaveLength(1);
    expect(items[0]?.places.length).toBeLessThan(PLACE_COUNT);
    expect(items[0]?.morePlaces).toBeDefined();
    expect(view.hiddenItems).toBeUndefined();
  });

  test("keeps the explanation and shows only a few places when the window is short", () => {
    const view = cleanupReviewView(reviewing(PLACE_COUNT), SHORT_DIALOG);
    expect(view.sections).toHaveLength(1);
    expect(view.sections[0]?.header.hint).toBe(UiCopy.cleanup.sections.delete.hint);
    expect(view.sections[0]?.items[0]?.places.length).toBeLessThan(PLACE_COUNT);
  });

  test("never lets a target run wider than the window", () => {
    const view = cleanupReviewView(reviewing(PLACE_COUNT), NARROW_DIALOG);
    for (const place of view.sections
      .flatMap((section) => section.items)
      .flatMap((item) => item.places)) {
      expect(place.target.length).toBeLessThan(NARROW.columns);
    }
  });
});

describe("key strip in a narrow window", () => {
  const rowWidth = (row: readonly { readonly key: string; readonly label: string }[]) =>
    row.reduce((sum, item) => sum + item.key.length + 1 + item.label.length, 0);
  const withFindings = () => {
    const initial = initialAppState(sampleAppContext);
    return { ...initial, scan: { ...initial.scan, findings: scannedFindings } };
  };

  test("is always one row, with every hint when there is room", () => {
    const { hints } = keyStripView(withFindings(), VERY_WIDE);
    expect(hints.map((item) => item.key)).toEqual(["↑↓", "space", "enter", "s", "m", "q"]);
  });

  test("fits an 80 column window without dropping the keys that matter", () => {
    const { hints } = keyStripView(withFindings(), NARROW);
    expect(rowWidth(hints)).toBeLessThan(NARROW.columns);
    const keys = hints.map((item) => item.key);
    for (const key of ["↑↓", "m", "q"]) expect(keys).toContain(key);
  });

  test("drops only optional hints when the window is tiny", () => {
    const state = withFindings();
    const tiny = keyStripView(state, { columns: TINY_COLUMNS, rows: NARROW.rows }).hints;
    expect(tiny.some((item) => item.key === "q")).toBe(true);
    expect(tiny.some((item) => item.key === "m")).toBe(true);
    expect(tiny.every((item) => item.essential)).toBe(true);
  });

  test("keeps the same order on every tab, with one extra key for the tab", () => {
    const base = withFindings();
    const foldersScreen = {
      ...base,
      screen: {
        kind: ScreenKind.Folders,
        folder: base.scope.root,
        selected: 0,
        previous: initialScreen,
      } as const,
    };
    const keys = keyStripView(foldersScreen, VERY_WIDE).hints.map((item) => item.key);
    expect(keys.at(0)).toBe("↑↓");
    expect(keys.slice(-2)).toEqual(["m", "q"]);
  });
});

describe("main screen in a wide window", () => {
  const withFindings = () => {
    const initial = initialAppState(sampleAppContext);
    return { ...initial, scan: { ...initial.scan, findings: scannedFindings } };
  };

  test("shows the selected finding beside the list", () => {
    const view = diagnosisView(withFindings(), 0, ROOMY, REFERENCE_DATE);
    expect(view.pane).toBeDefined();
    expect(view.strip).toEqual([]);
  });

  test("keeps the single list and a short strip about the chosen row when the window is narrow", () => {
    const view = diagnosisView(withFindings(), 1, NARROW, REFERENCE_DATE);
    expect(view.pane).toBeUndefined();
    expect(view.strip).toHaveLength(Layout.stripLines);
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
