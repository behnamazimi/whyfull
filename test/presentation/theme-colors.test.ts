import { describe, expect, test } from "bun:test";
import { ColorRole, colorSchemes, ThemeMode } from "../../src/presentation/theme.ts";

const MEANING_ROLES = [
  ColorRole.safe,
  ColorRole.caution,
  ColorRole.keep,
  ColorRole.danger,
  ColorRole.unknown,
] as const;

describe("colors that carry meaning", () => {
  for (const mode of Object.values(ThemeMode)) {
    test(`are all different from each other in ${mode} mode`, () => {
      const scheme = colorSchemes[mode];
      const values = MEANING_ROLES.map((role) => scheme[role]);
      expect(new Set(values).size).toBe(values.length);
    });
  }
});
