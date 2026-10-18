import { describe, expect, test } from "bun:test";
import { ByteSize, DirectoryNode, reviseTree } from "../../src/domain/index.ts";
import { buildTree, pathOf, REFERENCE_DATE } from "../support/domain-builders.ts";

const MOVIE = ByteSize.fromGigabytes(2);
const CACHE = ByteSize.fromGigabytes(3);
const SMALL_FILE = ByteSize.fromMegabytes(10);
const INSTALLER = ByteSize.fromMegabytes(200);
const SMALL_FILE_COUNT = 4;

const tree = buildTree("/Users/sam", {
  children: [
    {
      name: "Library",
      children: [{ name: "Caches", ownFilesSize: CACHE, ownFileCount: SMALL_FILE_COUNT }],
    },
    {
      name: "Downloads",
      ownFilesSize: SMALL_FILE,
      ownFileCount: 1,
      notableFiles: [{ name: "app.dmg", size: INSTALLER }],
    },
    { name: "Movies", ownFilesSize: MOVIE },
  ],
});

const none = { removals: [], replacements: [] };

describe("reviseTree", () => {
  test("returns the same tree when nothing in it changed", () => {
    expect(reviseTree(tree, none)).toBe(tree);
  });

  test("drops a removed folder and the size and file count it held", () => {
    const revised = reviseTree(tree, {
      removals: [{ path: pathOf("/Users/sam/Library/Caches"), size: CACHE }],
      replacements: [],
    });
    expect(revised.find(pathOf("/Users/sam/Library/Caches"))).toBeUndefined();
    expect(revised.totalSize.bytes).toBe(tree.totalSize.bytes - CACHE.bytes);
    expect(revised.fileCount).toBe(tree.fileCount - SMALL_FILE_COUNT);
    expect(tree.find(pathOf("/Users/sam/Library/Caches"))).toBeDefined();
  });

  test("takes a removed file out of its folder", () => {
    const revised = reviseTree(tree, {
      removals: [{ path: pathOf("/Users/sam/Downloads/app.dmg"), size: INSTALLER }],
      replacements: [],
    });
    const downloads = revised.find(pathOf("/Users/sam/Downloads"));
    expect(downloads?.notableFiles).toEqual([]);
    const before = tree.find(pathOf("/Users/sam/Downloads"))?.totalSize.bytes ?? 0;
    expect(downloads?.totalSize.bytes).toBe(before - INSTALLER.bytes);
  });

  test("puts a folder measured again in place of the old one", () => {
    const smaller = buildTree("/Users/sam/Movies", { ownFilesSize: SMALL_FILE });
    const revised = reviseTree(tree, { removals: [], replacements: [smaller] });
    expect(revised.find(pathOf("/Users/sam/Movies"))).toBe(smaller);
    expect(revised.totalSize.bytes).toBe(tree.totalSize.bytes - MOVIE.bytes + SMALL_FILE.bytes);
  });

  test("works on a partial tree whose measured folders hang below the root", () => {
    const caches = buildTree("/Users/sam/Library/Caches", { ownFilesSize: CACHE });
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
    const revised = reviseTree(partial, {
      removals: [{ path: caches.path, size: CACHE }],
      replacements: [],
    });
    expect(revised.children).toEqual([]);
    expect(revised.totalSize.isZero()).toBe(true);
  });
});
