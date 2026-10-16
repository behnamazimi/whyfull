import {
  FindingGroup,
  findingGroup,
  findingGroupOrder,
  type Finding,
} from "../../../domain/index.ts";

export const FindingFilter = { All: "all", ...FindingGroup } as const;
export type FindingFilter = (typeof FindingFilter)[keyof typeof FindingFilter];

export const matchesFilter = (filter: FindingFilter, finding: Finding): boolean =>
  filter === FindingFilter.All || filter === findingGroup(finding);

/** Filters worth offering: everything, then each group that has something in it. */
export const availableFilters = (findings: readonly Finding[]): readonly FindingFilter[] => [
  FindingFilter.All,
  ...findingGroupOrder.filter((group) =>
    findings.some((finding) => findingGroup(finding) === group),
  ),
];

export function nextFilter(current: FindingFilter, findings: readonly Finding[]): FindingFilter {
  const filters = availableFilters(findings);
  const position = filters.indexOf(current);
  return filters[(position + 1) % filters.length] ?? FindingFilter.All;
}
