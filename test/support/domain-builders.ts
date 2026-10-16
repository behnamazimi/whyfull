import { AbsolutePath, ByteSize, DirectoryNode } from "../../src/domain/index.ts";

export const REFERENCE_DATE = new Date("2026-10-01T00:00:00Z");

export function pathOf(raw: string): AbsolutePath {
  const parsed = AbsolutePath.parse(raw);
  if (!parsed.ok) throw new Error(`Invalid test path ${raw}: ${parsed.error}`);
  return parsed.value;
}

export interface FileSpec {
  readonly name: string;
  readonly size: ByteSize;
  readonly modified?: Date;
}

export interface DirectorySpec {
  readonly name: string;
  readonly ownFilesSize?: ByteSize;
  readonly ownFileCount?: number;
  readonly notableFiles?: readonly FileSpec[];
  readonly markers?: readonly string[];
  readonly modified?: Date;
  readonly children?: readonly DirectorySpec[];
}

function assemble(path: AbsolutePath, spec: DirectorySpec): DirectoryNode {
  const notableFiles = (spec.notableFiles ?? []).map((file) => ({
    path: path.child(file.name),
    size: file.size,
    lastModified: file.modified ?? REFERENCE_DATE,
  }));
  const notableSize = ByteSize.sum(notableFiles.map((file) => file.size));
  return DirectoryNode.assemble({
    path,
    ownFilesSize: (spec.ownFilesSize ?? ByteSize.zero).plus(notableSize),
    ownFileCount: (spec.ownFileCount ?? 0) + notableFiles.length,
    lastModified: spec.modified ?? REFERENCE_DATE,
    notableFiles,
    markerFiles: new Set(spec.markers ?? []),
    children: (spec.children ?? []).map((child) => assemble(path.child(child.name), child)),
  });
}

export function buildTree(rootPath: string, spec: Omit<DirectorySpec, "name">): DirectoryNode {
  return assemble(pathOf(rootPath), { name: rootPath, ...spec });
}
