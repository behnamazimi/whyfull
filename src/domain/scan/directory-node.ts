import type { AbsolutePath } from "../path/absolute-path.ts";
import { ByteSize } from "../size/byte-size.ts";
import type { NotableFile } from "./notable-file.ts";

export interface DirectoryContents {
  readonly path: AbsolutePath;
  readonly ownFilesSize: ByteSize;
  readonly ownFileCount: number;
  readonly lastModified: Date;
  readonly notableFiles: readonly NotableFile[];
  readonly markerFiles: ReadonlySet<string>;
  readonly children: readonly DirectoryNode[];
}

const latest = (dates: Iterable<Date>, initial: Date): Date => {
  let newest = initial;
  for (const date of dates) if (date > newest) newest = date;
  return newest;
};

export class DirectoryNode {
  readonly path: AbsolutePath;
  readonly ownFilesSize: ByteSize;
  readonly notableFiles: readonly NotableFile[];
  readonly markerFiles: ReadonlySet<string>;
  readonly children: readonly DirectoryNode[];
  readonly totalSize: ByteSize;
  readonly fileCount: number;
  readonly lastModified: Date;

  private constructor(contents: DirectoryContents) {
    this.path = contents.path;
    this.ownFilesSize = contents.ownFilesSize;
    this.notableFiles = contents.notableFiles;
    this.markerFiles = contents.markerFiles;
    this.children = [...contents.children].sort((left, right) =>
      ByteSize.largestFirst(left.totalSize, right.totalSize),
    );
    this.totalSize = contents.ownFilesSize.plus(
      ByteSize.sum(contents.children.map((child) => child.totalSize)),
    );
    this.fileCount = contents.children.reduce(
      (count, child) => count + child.fileCount,
      contents.ownFileCount,
    );
    this.lastModified = latest(
      [
        ...contents.children.map((child) => child.lastModified),
        ...contents.notableFiles.map((file) => file.lastModified),
      ],
      contents.lastModified,
    );
  }

  static assemble(contents: DirectoryContents): DirectoryNode {
    return new DirectoryNode(contents);
  }

  get name(): string {
    return this.path.name;
  }

  *walk(): Generator<DirectoryNode> {
    yield this;
    for (const child of this.children) yield* child.walk();
  }

  find(path: AbsolutePath): DirectoryNode | undefined {
    const segments = path.segmentsBelow(this.path);
    if (segments === undefined) return undefined;
    return segments.reduce<DirectoryNode | undefined>(
      (current, segment) => current?.children.find((child) => child.name === segment),
      this,
    );
  }
}
