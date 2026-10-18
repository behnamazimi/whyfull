import { describe, expect, test } from "bun:test";
import { ByteSize, DirectoryNode, largestFiles } from "../../src/domain/index.ts";
import { buildTree, pathOf, REFERENCE_DATE } from "../support/domain-builders.ts";

const PHOTO = ByteSize.fromMegabytes(10);
const MOVIE = ByteSize.fromGigabytes(2);
const ARCHIVE = ByteSize.fromGigabytes(1);
const LATER = new Date(REFERENCE_DATE.getTime() + 1);
const OWN_FILE_COUNT = 3;

const tree = buildTree("/Users/sam", {
  ownFilesSize: PHOTO,
  ownFileCount: OWN_FILE_COUNT,
  children: [
    { name: "Documents", notableFiles: [{ name: "backup.zip", size: ARCHIVE }] },
    { name: "Movies", notableFiles: [{ name: "trip.mov", size: MOVIE, modified: LATER }] },
  ],
});

describe("DirectoryNode", () => {
  test("totals sizes, file counts and the newest change from its subtree", () => {
    expect(tree.totalSize.bytes).toBe(PHOTO.bytes + MOVIE.bytes + ARCHIVE.bytes);
    expect(tree.fileCount).toBe(OWN_FILE_COUNT + 1 + 1);
    expect(tree.lastModified).toEqual(LATER);
  });

  test("orders children largest first", () => {
    expect(tree.children.map((child) => child.name)).toEqual(["Movies", "Documents"]);
  });

  test("finds descendants by path", () => {
    expect(tree.find(pathOf("/Users/sam/Movies"))?.totalSize).toEqual(MOVIE);
    expect(tree.find(pathOf("/Users/sam/Music"))).toBeUndefined();
    expect(tree.find(pathOf("/Applications"))).toBeUndefined();
  });

  test("locates a measured folder that hangs below a partial root", () => {
    const caches = buildTree("/Users/sam/Library/Caches", { ownFilesSize: PHOTO });
    const partial = DirectoryNode.assemble({
      path: pathOf("/Users/sam"),
      identity: undefined,
      ownFilesSize: ByteSize.zero,
      ownFileCount: 0,
      ownPersonalFileCount: 0,
      lastModified: REFERENCE_DATE,
      notableFiles: [],
      markerFiles: new Set(),
      children: [caches],
    });
    expect(partial.find(caches.path)).toBeUndefined();
    expect(partial.locate(caches.path)).toBe(caches);
    expect(partial.locate(pathOf("/Users/sam/Library/Mail"))).toBeUndefined();
  });

  test("lists the largest notable files", () => {
    expect(largestFiles(tree, 1).map((file) => file.path.name)).toEqual(["trip.mov"]);
  });
});
