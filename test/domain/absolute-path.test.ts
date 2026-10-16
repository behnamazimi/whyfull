import { describe, expect, test } from "bun:test";
import { AbsolutePath, PathError } from "../../src/domain/index.ts";
import { pathOf } from "../support/domain-builders.ts";

describe("AbsolutePath", () => {
  test("normalizes repeated and trailing separators", () => {
    expect(pathOf("//Users//sam/").toString()).toBe("/Users/sam");
  });

  test("rejects relative input and dot segments", () => {
    expect(AbsolutePath.parse("Users/sam")).toEqual({ ok: false, error: PathError.NotAbsolute });
    expect(AbsolutePath.parse("/Users/../etc")).toEqual({
      ok: false,
      error: PathError.RelativeSegment,
    });
  });

  test("knows its name, parent and extension", () => {
    const installer = pathOf("/Users/sam/Downloads/Setup.DMG");
    expect(installer.name).toBe("Setup.DMG");
    expect(installer.extension).toBe("dmg");
    expect(installer.parent?.toString()).toBe("/Users/sam/Downloads");
    expect(pathOf("/Users/sam/.zshrc").extension).toBeUndefined();
    expect(AbsolutePath.root.parent).toBeUndefined();
  });

  test("compares ancestry without matching name prefixes", () => {
    const home = pathOf("/Users/sam");
    expect(pathOf("/Users/sam/Library").isInside(home)).toBe(true);
    expect(pathOf("/Users/samantha").isInside(home)).toBe(false);
    expect(home.isInside(home)).toBe(false);
    expect(home.isSameOrInside(home)).toBe(true);
    expect(pathOf("/Users/sam/a/b").segmentsBelow(home)).toEqual(["a", "b"]);
  });

  test("refuses entry names that would escape the directory", () => {
    expect(() => pathOf("/tmp").child("..")).toThrow(RangeError);
    expect(() => pathOf("/tmp").child("a/b")).toThrow(RangeError);
  });
});
