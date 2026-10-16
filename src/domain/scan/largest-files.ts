import { ByteSize } from "../size/byte-size.ts";
import type { DirectoryNode } from "./directory-node.ts";
import type { NotableFile } from "./notable-file.ts";

export function largestFiles(root: DirectoryNode, count: number): readonly NotableFile[] {
  const files: NotableFile[] = [];
  for (const node of root.walk()) files.push(...node.notableFiles);
  return files.sort((left, right) => ByteSize.largestFirst(left.size, right.size)).slice(0, count);
}
