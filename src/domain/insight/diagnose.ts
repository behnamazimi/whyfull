import type { DiagnosisPolicy } from "../policy/policy.ts";
import type { Classification, ClassificationResult } from "../rules/classification.ts";
import type { RuleId } from "../rules/rule-id.ts";
import type { DirectoryNode } from "../scan/directory-node.ts";
import { Duration } from "../shared/duration.ts";
import { ByteSize } from "../size/byte-size.ts";
import {
  FindingKind,
  type Finding,
  type KnownItemFinding,
  type UnexplainedFolderFinding,
} from "./finding.ts";

export interface DiagnosisInput {
  readonly root: DirectoryNode;
  readonly classification: ClassificationResult;
  readonly policy: DiagnosisPolicy;
  readonly now: Date;
}

// Hash- or UUID-named folders mean nothing to people; their parent is the folder worth naming.
const MACHINE_GENERATED_NAME = /^(?:[0-9a-f]{16,}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i;

const hasMachineGeneratedName = (folder: DirectoryNode): boolean =>
  MACHINE_GENERATED_NAME.test(folder.name);

const newestOf = (dates: readonly Date[]): Date =>
  dates.reduce((newest, date) => (date > newest ? date : newest));

function knownItemFindings(input: DiagnosisInput): KnownItemFinding[] {
  const byRule = Map.groupBy(input.classification.classifications, (item) => item.rule.id);
  const isStale = (item: Classification): boolean =>
    Duration.between(item.lastModified, input.now).isAtLeast(input.policy.staleAfter);

  return [...byRule.values()].flatMap((items): KnownItemFinding[] => {
    const [first] = items;
    if (first === undefined) return [];
    const locations = [...items].sort((left, right) =>
      ByteSize.largestFirst(left.size, right.size),
    );
    return [
      {
        kind: FindingKind.KnownItem,
        rule: first.rule,
        size: ByteSize.sum(items.map((item) => item.size)),
        staleSize: ByteSize.sum(items.filter(isStale).map((item) => item.size)),
        locations,
        lastModified: newestOf(items.map((item) => item.lastModified)),
      },
    ];
  });
}

function locateUnexplainedFolders(
  directory: DirectoryNode,
  input: DiagnosisInput,
): DirectoryNode[] {
  const { classification, policy } = input;
  const unexplainedSize = classification.unclassifiedSizeOf(directory);
  if (!unexplainedSize.isAtLeast(policy.unexplainedFolderMinimumSize)) return [];

  const deeperFolders = directory.children.flatMap((child) =>
    locateUnexplainedFolders(child, input),
  );
  const deeperSize = ByteSize.sum(
    deeperFolders.map((folder) => classification.unclassifiedSizeOf(folder)),
  );
  const deeperFoldersExplainIt =
    deeperSize.shareOf(unexplainedSize) >= policy.shareExplainedByDeeperFolders &&
    !deeperFolders.some(hasMachineGeneratedName);
  return deeperFoldersExplainIt ? deeperFolders : [directory];
}

function unexplainedFolderFindings(input: DiagnosisInput): UnexplainedFolderFinding[] {
  return input.root.children
    .flatMap((child) => locateUnexplainedFolders(child, input))
    .map((folder) => ({
      kind: FindingKind.UnexplainedFolder,
      path: folder.path,
      size: input.classification.unclassifiedSizeOf(folder),
      lastModified: folder.lastModified,
    }));
}

export function diagnose(input: DiagnosisInput): readonly Finding[] {
  return [...knownItemFindings(input), ...unexplainedFolderFindings(input)]
    .filter((finding) => finding.size.isAtLeast(input.policy.minimumFindingSize))
    .sort((left, right) => ByteSize.largestFirst(left.size, right.size));
}

export const findingRuleIds = (findings: readonly Finding[]): ReadonlySet<RuleId> =>
  new Set(
    findings.flatMap((finding) =>
      finding.kind === FindingKind.KnownItem ? [finding.rule.id] : [],
    ),
  );
