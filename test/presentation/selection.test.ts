import { describe, expect, test } from "bun:test";
import { ByteSize, Duration, FindingKind, isStale } from "../../src/domain/index.ts";
import { SelectionState } from "../../src/presentation/theme.ts";
import { selectionOf } from "../../src/presentation/tui/view-models/selection-of.ts";
import { buildTree, REFERENCE_DATE } from "../support/domain-builders.ts";
import { reportFor, SAMPLE_HOME } from "../support/report-builder.ts";

const STALE_DAYS = 200;
const FRESH_DAYS = 5;
const MILLISECONDS_PER_DAY = 86_400_000;
const daysBefore = (days: number): Date =>
  new Date(REFERENCE_DATE.getTime() - days * MILLISECONDS_PER_DAY);

const project = (name: string, daysOld: number) => ({
  name,
  markers: ["package.json"],
  children: [
    {
      name: "node_modules",
      ownFilesSize: ByteSize.fromMegabytes(300),
      modified: daysBefore(daysOld),
    },
  ],
});

const report = reportFor(
  buildTree(SAMPLE_HOME.toString(), {
    children: [
      project("old-a", STALE_DAYS),
      project("old-b", STALE_DAYS),
      project("current", FRESH_DAYS),
    ],
  }),
);

const finding = report.findings.find((candidate) => candidate.kind === FindingKind.KnownItem);
const places = finding?.kind === FindingKind.KnownItem ? finding.locations : [];

describe("isStale", () => {
  test("is true only once the item is older than the limit", () => {
    const [first] = places;
    if (first === undefined) throw new Error("fixture has no places");
    const staleAfter = Duration.ofDays(1);
    expect(isStale({ ...first, lastModified: daysBefore(2) }, REFERENCE_DATE, staleAfter)).toBe(
      true,
    );
    expect(isStale({ ...first, lastModified: REFERENCE_DATE }, REFERENCE_DATE, staleAfter)).toBe(
      false,
    );
  });
});

describe("selection of a group", () => {
  test("is none, some or all depending on how many places are in the cleanup", () => {
    expect(places).toHaveLength(3);
    const cart = new Map<string, true>();
    expect(selectionOf(places, cart)).toBe(SelectionState.None);
    cart.set(places[0]?.path.toString() ?? "", true);
    expect(selectionOf(places, cart)).toBe(SelectionState.Some);
    for (const place of places) cart.set(place.path.toString(), true);
    expect(selectionOf(places, cart)).toBe(SelectionState.All);
  });
});
