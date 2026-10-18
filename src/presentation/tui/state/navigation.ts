import { FindingGroup, findingGroup, type Finding } from "../../../domain/index.ts";
import type { AppState } from "./app-state.ts";
import { ScreenKind } from "./screen.ts";

export const NavKind = {
  Group: "group",
  Finding: "finding",
} as const;
export type NavKind = (typeof NavKind)[keyof typeof NavKind];

/** Every stop of the cursor on the main list: a group's header, or one of the findings under it. */
export type NavItem =
  | {
      readonly kind: typeof NavKind.Group;
      readonly group: FindingGroup;
      readonly folded: boolean;
      /** Every finding in the group, shown or not. */
      readonly findings: readonly Finding[];
    }
  | {
      readonly kind: typeof NavKind.Finding;
      readonly finding: Finding;
      /** Where the finding is in the scan's own list, which a detail screen keeps. */
      readonly findingIndex: number;
    };

/** Groups the list opens with folded: the ones with nothing to do. */
export const initialCollapsedGroups: ReadonlySet<FindingGroup> = new Set([
  FindingGroup.Unrecognized,
  FindingGroup.Keep,
]);

const groupsPresent = (findings: readonly Finding[]): ReadonlySet<FindingGroup> =>
  new Set(findings.map(findingGroup));

/** A group that is all there is stays open, so a scan with nothing else doesn't open on a folded list. */
export function isFolded(state: AppState, group: FindingGroup): boolean {
  return state.collapsedGroups.has(group) && groupsPresent(state.scan.findings).size > 1;
}

/** The findings arrive grouped, so a header goes in wherever the group changes. */
export function navigationOf(state: AppState): readonly NavItem[] {
  const { findings } = state.scan;
  const items: NavItem[] = [];
  findings.forEach((finding, findingIndex) => {
    const group = findingGroup(finding);
    const previous = findings[findingIndex - 1];
    if (previous === undefined || findingGroup(previous) !== group) {
      items.push({
        kind: NavKind.Group,
        group,
        folded: isFolded(state, group),
        findings: findings.filter((candidate) => findingGroup(candidate) === group),
      });
    }
    if (!isFolded(state, group)) items.push({ kind: NavKind.Finding, finding, findingIndex });
  });
  return items;
}

export const navItemAt = (state: AppState, index: number): NavItem | undefined =>
  navigationOf(state)[index];

/**
 * A list that has just appeared puts the cursor on its first finding, not its first header: enter
 * on a header folds the group, which isn't what someone who just arrived is likely to want.
 */
export function onFirstFinding(state: AppState): AppState {
  const { screen } = state;
  if (screen.kind !== ScreenKind.Diagnosis || screen.selected !== 0) return state;
  const [first, second] = navigationOf(state);
  return first?.kind === NavKind.Group && second?.kind === NavKind.Finding
    ? { ...state, screen: { ...screen, selected: 1 } }
    : state;
}
