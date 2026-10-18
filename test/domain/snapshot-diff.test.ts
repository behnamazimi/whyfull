import { describe, expect, test } from "bun:test";
import {
  ByteSize,
  ChangeDirection,
  compareSnapshots,
  defaultHistoryPolicy,
  ScanScopeKind,
  shrinkMayBeUnreadable,
  summarizeSnapshot,
  type SnapshotSummary,
} from "../../src/domain/index.ts";
import { buildTree, REFERENCE_DATE } from "../support/domain-builders.ts";

const PHOTOS_BELOW_SAVED_GIGABYTES = 0.03;
const PHOTOS_NOW_GIGABYTES = 1;

const snapshotOf = (dockerGigabytes: number, photosGigabytes: number): SnapshotSummary =>
  summarizeSnapshot({
    root: buildTree("/Users/sam", {
      children: [
        {
          name: "Library",
          children: [
            {
              name: "Containers",
              children: [
                {
                  name: "com.docker.docker",
                  ownFilesSize: ByteSize.fromGigabytes(dockerGigabytes),
                },
              ],
            },
          ],
        },
        { name: "Pictures", ownFilesSize: ByteSize.fromGigabytes(photosGigabytes) },
        { name: "Notes", ownFilesSize: ByteSize.fromMegabytes(10) },
      ],
    }),
    scopeKind: ScanScopeKind.Folder,
    takenAt: REFERENCE_DATE,
    policy: defaultHistoryPolicy,
  });

describe("snapshot history", () => {
  test("keeps only folders big enough to matter", () => {
    expect(snapshotOf(2, 1).folders.map((folder) => folder.path.toString())).not.toContain(
      "/Users/sam/Notes",
    );
  });

  test("reports the deepest folder that explains the growth", () => {
    const diff = compareSnapshots(snapshotOf(2, 1), snapshotOf(20, 1), defaultHistoryPolicy);
    expect(diff.total).toEqual({
      direction: ChangeDirection.Grew,
      amount: ByteSize.fromGigabytes(18),
    });
    expect(diff.grownFolders.map((folder) => folder.path.toString())).toEqual([
      "/Users/sam/Library/Containers/com.docker.docker",
    ]);
  });

  test("never counts a folder that was too small to save as having grown from nothing", () => {
    const diff = compareSnapshots(
      snapshotOf(2, PHOTOS_BELOW_SAVED_GIGABYTES),
      snapshotOf(2, PHOTOS_NOW_GIGABYTES),
      defaultHistoryPolicy,
    );
    const photos = diff.grownFolders.find(
      (folder) => folder.path.toString() === "/Users/sam/Pictures",
    );
    expect(photos?.beforeKnown).toBe(false);
    expect(photos?.before).toEqual(defaultHistoryPolicy.folderMinimumSize);
    expect(photos?.growth).toEqual(
      ByteSize.fromGigabytes(PHOTOS_NOW_GIGABYTES).minusOrZero(
        defaultHistoryPolicy.folderMinimumSize,
      ),
    );
  });

  test("flags a shrink as doubtful only when the newer scan couldn't read some folders", () => {
    const shrank = compareSnapshots(
      snapshotOf(20, 1),
      snapshotOf(2, 1),
      defaultHistoryPolicy,
      true,
    );
    const grew = compareSnapshots(snapshotOf(2, 1), snapshotOf(20, 1), defaultHistoryPolicy, true);
    const readable = compareSnapshots(snapshotOf(20, 1), snapshotOf(2, 1), defaultHistoryPolicy);
    expect(shrinkMayBeUnreadable(shrank)).toBe(true);
    expect(shrinkMayBeUnreadable(grew)).toBe(false);
    expect(shrinkMayBeUnreadable(readable)).toBe(false);
  });

  test("reports shrinking totals without listing folders", () => {
    const diff = compareSnapshots(snapshotOf(20, 1), snapshotOf(2, 1), defaultHistoryPolicy);
    expect(diff.total.direction).toBe(ChangeDirection.Shrank);
    expect(diff.grownFolders).toEqual([]);
  });
});
