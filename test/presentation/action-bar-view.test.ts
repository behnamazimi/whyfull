import { describe, expect, test } from "bun:test";
import { DiagnosisUpdateKind } from "../../src/application/index.ts";
import {
  ByteSize,
  CartEntryKind,
  FindingKind,
  type HighRiskEntry,
} from "../../src/domain/index.ts";
import { UiCopy } from "../../src/presentation/copy/ui-copy.ts";
import { UserAction } from "../../src/presentation/keymap.ts";
import { ColorRole } from "../../src/presentation/theme.ts";
import { AppEventKind } from "../../src/presentation/tui/state/app-event.ts";
import {
  initialAppState,
  ScanStatus,
  type AppState,
} from "../../src/presentation/tui/state/app-state.ts";
import { reduce } from "../../src/presentation/tui/state/reducer.ts";
import { actionBarView } from "../../src/presentation/tui/view-models/action-bar-view.ts";
import { Density } from "../../src/presentation/tui/view-models/density.ts";
import { buildTree, nextIdentity, REFERENCE_DATE } from "../support/domain-builders.ts";
import { sampleAppContext } from "../support/app-context.ts";
import { reportFor, SAMPLE_HOME } from "../support/report-builder.ts";

const WIDE = { columns: 120, rows: 40 };
const NARROW = { columns: 80, rows: 18 };

const report = reportFor(
  buildTree(SAMPLE_HOME.toString(), {
    children: [
      {
        name: "Library",
        children: [
          {
            name: "Caches",
            children: [{ name: "Homebrew", ownFilesSize: ByteSize.fromGigabytes(3) }],
          },
        ],
      },
    ],
  }),
);
const scanned = reduce(initialAppState(sampleAppContext), {
  kind: AppEventKind.DiagnosisUpdated,
  update: { kind: DiagnosisUpdateKind.Completed, report },
}).state;
const picked = reduce(scanned, {
  kind: AppEventKind.ActionRequested,
  action: UserAction.ToggleCleanup,
}).state;

const textOf = (state: AppState, viewport = WIDE): string =>
  actionBarView(state, viewport, Density.Roomy)
    .parts.map((part) => part.text)
    .join("");

describe("the action bar", () => {
  test("invites you to select, and offers all safe items, before anything is selected", () => {
    const view = actionBarView(scanned, WIDE, Density.Roomy);
    expect(textOf(scanned)).toContain(UiCopy.actionBar.nothingSelected);
    expect(view.parts.some((part) => part.action === UserAction.SelectAllSafe)).toBe(true);
    expect(view.button?.enabled).toBe(false);
  });

  test("shows the total and enables the review button once something is selected", () => {
    const view = actionBarView(picked, WIDE, Density.Roomy);
    expect(textOf(picked)).toContain("selected");
    expect(textOf(picked)).toContain(UiCopy.actionBar.confirmNote);
    expect(view.button).toMatchObject({ enabled: true, action: UserAction.ReviewCleanup });
    expect(view.button?.label).toBe(UiCopy.actionBar.reviewAndFree("3.0 GB"));
  });

  test("keeps the button off until the first folders are measured, and says why", () => {
    const running = {
      ...picked,
      scan: {
        status: ScanStatus.Running,
        stage: undefined,
        progress: undefined,
        findings: [],
        preview: undefined,
      },
    } as const;
    expect(textOf(running)).toContain(UiCopy.actionBar.waitingForFirstResults);
    expect(actionBarView(running, WIDE, Density.Roomy).button?.enabled).toBe(false);
  });

  test("turns the button on once a running scan has measured something completely", () => {
    const running = {
      ...picked,
      scan: {
        status: ScanStatus.Running,
        stage: undefined,
        progress: undefined,
        findings: report.findings,
        preview: report,
      },
    } as const;
    expect(actionBarView(running, WIDE, Density.Roomy).button?.enabled).toBe(true);
    expect(textOf(running)).toContain(UiCopy.actionBar.confirmNote);
  });

  test("shows a notice in place of the usual words, keeping the button", () => {
    const noticed = { ...picked, notice: "Copied." };
    expect(textOf(noticed)).toBe("Copied.");
    expect(actionBarView(noticed, WIDE, Density.Roomy).button).toBeDefined();
  });

  test("has no button when the scan failed", () => {
    const failed = {
      ...scanned,
      scan: { status: ScanStatus.Failed, reason: "disk gone", findings: [] },
    } as const;
    expect(actionBarView(failed, WIDE, Density.Roomy).button).toBeUndefined();
    expect(textOf(failed)).toBe(UiCopy.actionBar.scanFailed);
  });

  test("drops words from the end in a narrow window but keeps the first", () => {
    const narrow = textOf(scanned, NARROW);
    expect(narrow.startsWith(UiCopy.actionBar.nothingSelected)).toBe(true);
    expect(narrow.length).toBeLessThan(textOf(scanned, WIDE).length);
  });

  test("marks the total in the danger colour when items will be deleted for good", () => {
    const [finding] = report.findings;
    if (finding?.kind !== FindingKind.KnownItem) throw new Error("expected a known finding");
    const entry: HighRiskEntry = {
      kind: CartEntryKind.HighRisk,
      path: SAMPLE_HOME.child("Movies"),
      size: ByteSize.fromGigabytes(1),
      fileCount: 1,
      personalFileCount: 0,
      lastModified: REFERENCE_DATE,
      scannedIdentity: nextIdentity(),
      rule: undefined,
    };
    const risky = { ...scanned, cart: new Map([[entry.path.toString(), entry]]) };
    const view = actionBarView(risky, WIDE, Density.Roomy);
    expect(view.parts.some((part) => part.color === ColorRole.danger)).toBe(true);
  });
});

describe("the review button's words", () => {
  test("keeps its plain words while nothing is selected", () => {
    expect(actionBarView(scanned, WIDE, Density.Roomy).button?.label).toBe(UiCopy.actionBar.review);
  });
});
