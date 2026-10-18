import { describe, expect, test } from "bun:test";
import { RecordScanHistory, type SnapshotRepository } from "../../src/application/index.ts";
import {
  ByteSize,
  ChangeDirection,
  defaultHistoryPolicy,
  folderScope,
  ScanIssueKind,
  type AbsolutePath,
  type ScanIssue,
  type ScanSnapshot,
  type SnapshotSummary,
} from "../../src/domain/index.ts";
import { buildTree, pathOf, REFERENCE_DATE } from "../support/domain-builders.ts";

const HOME = "/Users/sam";
const KEEP_FIRST_GIGABYTES = 5;
const KEEP_LATER_GIGABYTES = 2;

function memoryRepository(): SnapshotRepository & { readonly saved: SnapshotSummary[] } {
  const saved: SnapshotSummary[] = [];
  return {
    saved,
    latestFor: (root: AbsolutePath) =>
      saved.filter((summary) => summary.root.toString() === root.toString()).at(-1),
    save: (summary) => {
      saved.push(summary);
    },
  };
}

const snapshotOf = (moviesGigabytes: number, issues: readonly ScanIssue[] = []): ScanSnapshot => ({
  root: buildTree(HOME, {
    children: [{ name: "Movies", ownFilesSize: ByteSize.fromGigabytes(moviesGigabytes) }],
  }),
  issues,
  startedAt: REFERENCE_DATE,
  finishedAt: REFERENCE_DATE,
});

describe("RecordScanHistory", () => {
  const scope = folderScope(pathOf(HOME));

  test("saves the first scan and has nothing to compare it with", () => {
    const repository = memoryRepository();
    const history = new RecordScanHistory(repository, defaultHistoryPolicy);
    expect(history.recordAndCompare(snapshotOf(KEEP_FIRST_GIGABYTES), scope)).toBeUndefined();
    expect(repository.saved).toHaveLength(1);
  });

  test("compares a later scan with the one before it", () => {
    const history = new RecordScanHistory(memoryRepository(), defaultHistoryPolicy);
    history.recordAndCompare(snapshotOf(KEEP_FIRST_GIGABYTES), scope);
    const diff = history.recordAndCompare(snapshotOf(KEEP_LATER_GIGABYTES), scope);
    expect(diff?.total.direction).toBe(ChangeDirection.Shrank);
    expect(diff?.currentHasUnreadableFolders).toBe(false);
  });

  test("notes when the later scan couldn't read some folders", () => {
    const history = new RecordScanHistory(memoryRepository(), defaultHistoryPolicy);
    history.recordAndCompare(snapshotOf(KEEP_FIRST_GIGABYTES), scope);
    const locked = { kind: ScanIssueKind.PermissionDenied, path: pathOf(`${HOME}/Movies`) };
    const diff = history.recordAndCompare(snapshotOf(KEEP_LATER_GIGABYTES, [locked]), scope);
    expect(diff?.currentHasUnreadableFolders).toBe(true);
  });
});
