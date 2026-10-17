import {
  FindingGroup,
  findingGroup,
  findingGroupOrder,
  type Finding,
} from "../../../domain/index.ts";

/** What the list is narrowed to. Items whyfull never changes show only under "all". */
export const FindingFilter = {
  All: "all",
  Safe: FindingGroup.Safe,
  Check: FindingGroup.Check,
  Unrecognized: FindingGroup.Unrecognized,
} as const;
export type FindingFilter = (typeof FindingFilter)[keyof typeof FindingFilter];

export const matchesFilter = (filter: FindingFilter, finding: Finding): boolean =>
  filter === FindingFilter.All || filter === findingGroup(finding);

const isFilterGroup = (group: FindingGroup): group is Exclude<FindingFilter, "all"> =>
  group !== FindingGroup.Keep;

/** Filters worth offering: everything, then each group that has something in it. */
export const availableFilters = (findings: readonly Finding[]): readonly FindingFilter[] => [
  FindingFilter.All,
  ...findingGroupOrder
    .filter(isFilterGroup)
    .filter((group) => findings.some((finding) => findingGroup(finding) === group)),
];

export function nextFilter(current: FindingFilter, findings: readonly Finding[]): FindingFilter {
  const filters = availableFilters(findings);
  const position = filters.indexOf(current);
  return filters[(position + 1) % filters.length] ?? FindingFilter.All;
}
