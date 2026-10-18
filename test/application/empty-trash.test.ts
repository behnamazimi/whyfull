import { describe, expect, test } from "bun:test";
import {
  CleanupEventKind,
  ExecuteCleanup,
  PlanCleanup,
  type CleanupEvent,
} from "../../src/application/index.ts";
import {
  atPath,
  ByteSize,
  CartEntryKind,
  Category,
  CleanupActionKind,
  defaultCleanupPolicy,
  defineRule,
  draftCleanup,
  emptyTrash,
  OutcomeKind,
  PathTemplate,
  RuleId,
  SafetyLevel,
} from "../../src/domain/index.ts";
import { buildTree, pathOf } from "../support/domain-builders.ts";
import {
  appsRunning,
  FakeFileSystem,
  FakeOwnerTools,
  MemoryJournal,
  volumeWithAvailable,
} from "../support/fake-cleanup-ports.ts";
import { sampleHighRiskLimits } from "../support/sample-high-risk-limits.ts";

const HOME = pathOf("/Users/sam");
const TRASH_GB = 4;
const TRASH_SIZE = ByteSize.fromGigabytes(TRASH_GB);

const trashRule = defineRule({
  id: RuleId.Trash,
  category: Category.Trash,
  locator: atPath(PathTemplate.underHome(".Trash")),
  safety: SafetyLevel.NeedsReview,
  remedy: emptyTrash(),
});
const home = buildTree(HOME.toString(), {
  children: [{ name: ".Trash", ownFilesSize: TRASH_SIZE }],
});
const trashPath = pathOf("/Users/sam/.Trash");
const draft = draftCleanup({
  entries: [{ kind: CartEntryKind.Recognized, path: trashPath, rule: trashRule, size: TRASH_SIZE }],
  root: home,
  classification: { classifications: [], unclassifiedSizeOf: () => ByteSize.zero },
  highRiskLimits: sampleHighRiskLimits,
  protectedLocations: [HOME],
});

async function collect(events: AsyncIterable<CleanupEvent>): Promise<CleanupEvent[]> {
  const collected: CleanupEvent[] = [];
  for await (const event of events) collected.push(event);
  return collected;
}

describe("emptying the Trash", () => {
  test("is drafted as one action for the whole Trash", () => {
    expect(draft.actions).toEqual([
      { kind: CleanupActionKind.EmptyTrash, path: trashPath, rule: trashRule, size: TRASH_SIZE },
    ]);
  });

  test("is checked, run through the system, and journaled like any other action", async () => {
    const files = new FakeFileSystem();
    files.add(trashPath);
    const plan = await new PlanCleanup({
      files,
      apps: appsRunning(),
      ownerTools: new FakeOwnerTools(new Set()),
      protectedLocations: [HOME],
    }).plan(draft, HOME);
    expect(plan.actions.map((action) => action.kind)).toEqual([CleanupActionKind.EmptyTrash]);

    const journal = new MemoryJournal();
    const events = await collect(
      new ExecuteCleanup({
        apps: appsRunning(),
        volumes: volumeWithAvailable(ByteSize.fromGigabytes(1), ByteSize.fromGigabytes(5)),
        files,
        trash: files,
        remover: files,
        ownerTools: new FakeOwnerTools(new Set()),
        sizeMeter: files,
        journal,
        policy: defaultCleanupPolicy,
      }).run(plan, HOME),
    );
    const finished = events.at(-1);
    if (finished?.kind !== CleanupEventKind.Finished) throw new Error("cleanup did not finish");
    expect(files.trashEmptied).toBe(1);
    expect(files.removed).toEqual([]);
    expect(journal.outcomes.map((result) => result.outcome)).toEqual([OutcomeKind.Done]);
    expect(finished.report.removedSize).toEqual(TRASH_SIZE);
    expect(finished.report.measuredFreeSpaceGain).toEqual(ByteSize.fromGigabytes(4));
  });
});
