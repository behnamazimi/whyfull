import { describe, expect, test } from "bun:test";
import {
  CleanupEventKind,
  ExecuteCleanup,
  PlanCleanup,
  type CleanupEvent,
} from "../../src/application/index.ts";
import {
  BlockReason,
  ByteSize,
  CleanupActionKind,
  defaultCleanupPolicy,
  OutcomeKind,
  type CleanupPlan,
  type HighRiskAction,
} from "../../src/domain/index.ts";
import { nextIdentity, pathOf } from "../support/domain-builders.ts";
import {
  appsRunning,
  FakeFileSystem,
  FakeOwnerTools,
  MemoryJournal,
  volumeWithAvailable,
} from "../support/fake-cleanup-ports.ts";

const HOME = pathOf("/Users/sam");
const VMS = pathOf("/Users/sam/VMs");
const GIGABYTE = ByteSize.fromGigabytes(1);
const SLIGHTLY_LARGER = ByteSize.fromMegabytes(1_005);
const MUCH_LARGER = ByteSize.fromGigabytes(2);
const HALF = ByteSize.fromMegabytes(500);
const FILE_COUNT = 12;

const scannedIdentity = nextIdentity();
const action: HighRiskAction = {
  kind: CleanupActionKind.DeleteHighRisk,
  path: VMS,
  size: GIGABYTE,
  fileCount: FILE_COUNT,
  scannedIdentity,
  rule: undefined,
};
const plan: CleanupPlan = { actions: [action], blocked: [] };

function scannedFiles(): FakeFileSystem {
  const files = new FakeFileSystem();
  files.addScanned(VMS, scannedIdentity, GIGABYTE);
  return files;
}

const planner = (files: FakeFileSystem): PlanCleanup =>
  new PlanCleanup({
    files,
    apps: appsRunning(),
    ownerTools: new FakeOwnerTools(new Set()),
    protectedLocations: [HOME],
  });

async function execute(files: FakeFileSystem, journal = new MemoryJournal()) {
  const events: CleanupEvent[] = [];
  for await (const event of new ExecuteCleanup({
    volumes: volumeWithAvailable(),
    files,
    trash: files,
    remover: files,
    ownerTools: new FakeOwnerTools(new Set()),
    sizeMeter: files,
    journal,
    policy: defaultCleanupPolicy,
  }).run(plan, HOME)) {
    events.push(event);
  }
  const finished = events.at(-1);
  if (finished?.kind !== CleanupEventKind.Finished) throw new Error("cleanup did not finish");
  return finished.report;
}

describe("PlanCleanup with high-risk items", () => {
  test("approves the item the scan saw", async () => {
    const approved = await planner(scannedFiles()).plan({ actions: [action], blocked: [] }, HOME);
    expect(approved.actions).toEqual([action]);
  });

  test("blocks an item that was replaced since the scan", async () => {
    const files = scannedFiles();
    files.replace(VMS);
    const approved = await planner(files).plan({ actions: [action], blocked: [] }, HOME);
    expect(approved.actions).toEqual([]);
    expect(approved.blocked.map((item) => item.reason)).toEqual([BlockReason.ChangedSinceScan]);
  });
});

describe("ExecuteCleanup with high-risk items", () => {
  test("deletes the item and journals it", async () => {
    const files = scannedFiles();
    const journal = new MemoryJournal();
    const report = await execute(files, journal);
    expect(files.removed).toEqual([VMS.toString()]);
    expect(files.trashed).toEqual([]);
    expect(journal.intents).toEqual([action]);
    expect(report.highRiskRemovedSize).toEqual(GIGABYTE);
  });

  test("still deletes an item that grew a little", async () => {
    const files = scannedFiles();
    files.resize(VMS, SLIGHTLY_LARGER);
    await execute(files);
    expect(files.removed).toEqual([VMS.toString()]);
  });

  test("leaves an item alone when it grew since the scan", async () => {
    const files = scannedFiles();
    files.resize(VMS, MUCH_LARGER);
    const report = await execute(files);
    expect(files.removed).toEqual([]);
    expect(report.results.map((result) => result.outcome)).toEqual([
      OutcomeKind.SkippedBecauseChanged,
    ]);
  });

  test("reports a partial deletion with what it freed", async () => {
    const files = scannedFiles();
    files.failRemoval(VMS, HALF);
    const report = await execute(files);
    expect(report.results.map((result) => [result.outcome, result.freed])).toEqual([
      [OutcomeKind.PartlyDeleted, GIGABYTE.minusOrZero(HALF)],
    ]);
    expect(report.removedSize).toEqual(GIGABYTE.minusOrZero(HALF));
  });

  test("reports a failure when nothing was removed", async () => {
    const files = scannedFiles();
    files.failRemoval(VMS, GIGABYTE);
    const report = await execute(files);
    expect(report.results.map((result) => result.outcome)).toEqual([OutcomeKind.Failed]);
    expect(report.removedSize).toEqual(ByteSize.zero);
  });
});
