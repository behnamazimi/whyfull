import type { Rule } from "../rules/rule.ts";

export const runningOwnerApp = (
  rules: readonly Rule[],
  runningApps: ReadonlySet<string>,
): string | undefined =>
  rules.flatMap((rule) => rule.ownerApps).find((app) => runningApps.has(app));
