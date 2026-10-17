import { describe, expect, test } from "bun:test";
import { actionForKey, keyLabel, keymap, UserAction } from "../../src/presentation/keymap.ts";

describe("keymap", () => {
  test("the number keys open the tabs and the old letters still do", () => {
    expect(actionForKey("1")).toBe(UserAction.ShowCleanup);
    expect(actionForKey("2")).toBe(UserAction.BrowseFolders);
    expect(actionForKey("3")).toBe(UserAction.ShowDiskOverview);
    expect(actionForKey("4")).toBe(UserAction.ShowGrowth);
    expect(actionForKey("b")).toBe(UserAction.BrowseFolders);
    expect(actionForKey("d")).toBe(UserAction.ShowDiskOverview);
    expect(actionForKey("g")).toBe(UserAction.ShowGrowth);
  });

  test("s selects all safe items and a capital S copies the summary", () => {
    expect(actionForKey("s")).toBe(UserAction.SelectAllSafe);
    expect(actionForKey("S")).toBe(UserAction.CopySummary);
  });

  test("m and ? both open the More menu", () => {
    expect(actionForKey("m")).toBe(UserAction.Help);
    expect(actionForKey("?")).toBe(UserAction.Help);
  });

  test("no key is bound to two actions", () => {
    const keys = Object.values(keymap).flat();
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("every action shows a key that actually triggers it", () => {
    for (const action of Object.values(UserAction)) {
      const shown = keyLabel[action];
      const triggers = keymap[action];
      const aliases = [shown, ...triggers];
      expect(aliases.some((alias) => actionForKey(alias) === action)).toBe(true);
    }
  });
});
