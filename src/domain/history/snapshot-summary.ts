import type { AbsolutePath } from "../path/absolute-path.ts";
import type { HistoryPolicy } from "../policy/policy.ts";
import type { DirectoryNode } from "../scan/directory-node.ts";
import type { ScanScopeKind } from "../scan/scan-scope.ts";
import type { ByteSize } from "../size/byte-size.ts";

export interface FolderTotal {
  readonly path: AbsolutePath;
  readonly size: ByteSize;
}

export interface SnapshotSummary {
  readonly root: AbsolutePath;
  readonly scopeKind: ScanScopeKind;
  readonly takenAt: Date;
  readonly totalSize: ByteSize;
  readonly folders: readonly FolderTotal[];
}

export interface SnapshotSubject {
  readonly root: DirectoryNode;
  readonly scopeKind: ScanScopeKind;
  readonly takenAt: Date;
  readonly policy: HistoryPolicy;
}

function collectLargeFolders(
  node: DirectoryNode,
  policy: HistoryPolicy,
  into: FolderTotal[],
): void {
  if (!node.totalSize.isAtLeast(policy.folderMinimumSize)) return;
  into.push({ path: node.path, size: node.totalSize });
  for (const child of node.children) collectLargeFolders(child, policy, into);
}

export function summarizeSnapshot(subject: SnapshotSubject): SnapshotSummary {
  const folders: FolderTotal[] = [];
  collectLargeFolders(subject.root, subject.policy, folders);
  return {
    root: subject.root.path,
    scopeKind: subject.scopeKind,
    takenAt: subject.takenAt,
    totalSize: subject.root.totalSize,
    folders,
  };
}
