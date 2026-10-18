import type { AbsolutePath } from "../path/absolute-path.ts";
import { ByteSize } from "../size/byte-size.ts";
import { DirectoryNode } from "./directory-node.ts";

/** Something a cleanup took away: a folder, or a file with the size it had. */
export interface Removal {
  readonly path: AbsolutePath;
  readonly size: ByteSize;
}

export interface TreeRevision {
  readonly removals: readonly Removal[];
  /** Folders measured again after a cleanup, to stand in for what the tree held before. */
  readonly replacements: readonly DirectoryNode[];
}

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

const ownFileCountOf = (node: DirectoryNode): number =>
  node.fileCount - sum(node.children.map((child) => child.fileCount));

const ownPersonalFileCountOf = (node: DirectoryNode): number =>
  node.personalFileCount - sum(node.children.map((child) => child.personalFileCount));

const isTouched = (node: DirectoryNode, revision: TreeRevision): boolean =>
  revision.removals.some((removal) => removal.path.isInside(node.path)) ||
  revision.replacements.some((replacement) => replacement.path.isInside(node.path));

/**
 * The same tree after a cleanup, without a new scan. Folders are matched by path, so it also works
 * on a partial tree, where measured folders hang below the root without the folders in between.
 */
export function reviseTree(node: DirectoryNode, revision: TreeRevision): DirectoryNode {
  if (!isTouched(node, revision)) return node;
  const children = node.children.flatMap((child): DirectoryNode[] => {
    if (revision.removals.some((removal) => child.path.isSameOrInside(removal.path))) return [];
    const replacement = revision.replacements.find((candidate) =>
      candidate.path.equals(child.path),
    );
    return [replacement ?? reviseTree(child, revision)];
  });
  const arrivals = revision.replacements.filter(
    (replacement) =>
      replacement.path.parent?.equals(node.path) === true &&
      !node.children.some((child) => child.path.equals(replacement.path)),
  );
  const removedFiles = revision.removals.filter(
    (removal) =>
      removal.path.parent?.equals(node.path) === true &&
      !node.children.some((child) => child.path.equals(removal.path)),
  );
  const ownRemoved = ByteSize.sum(removedFiles.map((removal) => removal.size));
  return DirectoryNode.assemble({
    path: node.path,
    identity: node.identity,
    ownFilesSize: node.ownFilesSize.minusOrZero(ownRemoved),
    ownFileCount: Math.max(0, ownFileCountOf(node) - removedFiles.length),
    ownPersonalFileCount: ownPersonalFileCountOf(node),
    lastModified: node.lastModified,
    notableFiles: node.notableFiles.filter(
      (file) => !removedFiles.some((removal) => removal.path.equals(file.path)),
    ),
    markerFiles: node.markerFiles,
    children: [...children, ...arrivals],
  });
}
