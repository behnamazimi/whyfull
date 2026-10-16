import type { DirectoryNode } from "../scan/directory-node.ts";

export interface ConditionSubject {
  readonly directory: DirectoryNode;
  readonly parent: DirectoryNode | undefined;
}

export interface Condition {
  readonly requiredMarkerFiles: readonly string[];
  isSatisfiedBy(subject: ConditionSubject): boolean;
}

export const containsMarkerFile = (fileName: string): Condition => ({
  requiredMarkerFiles: [fileName],
  isSatisfiedBy: ({ directory }) => directory.markerFiles.has(fileName),
});

export const parentContainsMarkerFile = (fileName: string): Condition => ({
  requiredMarkerFiles: [fileName],
  isSatisfiedBy: ({ parent }) => parent?.markerFiles.has(fileName) ?? false,
});

export const anyOf = (...conditions: readonly Condition[]): Condition => ({
  requiredMarkerFiles: conditions.flatMap((condition) => condition.requiredMarkerFiles),
  isSatisfiedBy: (subject) => conditions.some((condition) => condition.isSatisfiedBy(subject)),
});
