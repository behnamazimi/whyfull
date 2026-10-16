import type { Stats } from "node:fs";
import { lstat, readdir } from "node:fs/promises";
import {
  ScanEventKind,
  type Clock,
  type ScanEvent,
  type ScanRequest,
} from "../../application/index.ts";
import {
  ByteSize,
  DirectoryNode,
  failure,
  ScanIssueKind,
  success,
  type AbsolutePath,
  type DirectoryContents,
  type ItemIdentity,
  type NotableFile,
  type Result,
  type ScanIssue,
  type ScanSnapshot,
} from "../../domain/index.ts";
import { ConcurrencyLimiter, type EventChannel } from "../../infrastructure/index.ts";
import { scanIssueKindFor } from "./file-system-errors.ts";

// st_blocks is counted in 512-byte units on macOS and Linux, whatever the filesystem block size.
const STAT_BLOCK_UNIT_BYTES = 512;
const STAT_BLOCK_UNIT = ByteSize.fromBytes(STAT_BLOCK_UNIT_BYTES);
const CONCURRENT_DIRECTORY_READS = 64;
const PROGRESS_INTERVAL_MILLISECONDS = 100;
const ROOT_DEPTH = 0;
const TOP_LEVEL_DEPTH = ROOT_DEPTH + 1;

interface Entry {
  readonly path: AbsolutePath;
  readonly stats: Stats;
}

interface Listing {
  readonly ownFilesSize: ByteSize;
  readonly ownFileCount: number;
  readonly ownPersonalFileCount: number;
  readonly notableFiles: readonly NotableFile[];
  readonly markerFiles: ReadonlySet<string>;
  readonly subdirectories: readonly Entry[];
}

const isPresent = <Value>(value: Value | undefined): value is Value => value !== undefined;

const identityOf = (stats: Stats): ItemIdentity => ({
  device: stats.dev,
  inode: stats.ino,
  isSymbolicLink: stats.isSymbolicLink(),
});

export class DirectoryWalk {
  private readonly limiter = new ConcurrencyLimiter(CONCURRENT_DIRECTORY_READS);
  private readonly countedHardLinks = new Set<string>();
  private readonly excludedPaths: ReadonlySet<string>;
  private readonly issues: ScanIssue[] = [];
  private directoriesScanned = 0;
  private bytesFound = 0;
  private lastProgressAt = 0;

  constructor(
    private readonly request: ScanRequest,
    private readonly events: EventChannel<ScanEvent>,
    private readonly clock: Clock,
  ) {
    this.excludedPaths = new Set(request.excludedPaths?.map((path) => path.toString()));
  }

  async run(): Promise<ScanSnapshot> {
    const startedAt = this.clock.now();
    const { root } = this.request;
    const rootStats = await this.statRoot(root);
    const rootNode =
      rootStats === undefined
        ? undefined
        : await this.visit(
            { path: root, stats: rootStats },
            await this.allowedDevices(rootStats),
            ROOT_DEPTH,
          );
    return {
      root: rootNode ?? DirectoryNode.assemble(emptyContents(root, startedAt)),
      issues: this.issues,
      startedAt,
      finishedAt: this.clock.now(),
    };
  }

  private async allowedDevices(rootStats: Stats): Promise<ReadonlySet<number>> {
    const anchors = this.request.volumesOf;
    if (anchors === undefined) return new Set([rootStats.dev]);
    const devices = await Promise.all(
      anchors.map(async (anchor) => {
        try {
          return (await lstat(anchor.toString())).dev;
        } catch (error) {
          this.issues.push({ kind: scanIssueKindFor(error), path: anchor });
          return undefined;
        }
      }),
    );
    return new Set(devices.filter(isPresent));
  }

  private async statRoot(root: AbsolutePath): Promise<Stats | undefined> {
    try {
      const stats = await lstat(root.toString());
      if (stats.isDirectory()) return stats;
      this.issues.push({ kind: ScanIssueKind.Unreadable, path: root });
    } catch (error) {
      this.issues.push({ kind: scanIssueKindFor(error), path: root });
    }
    return undefined;
  }

  private async visit(
    directory: Entry,
    allowedDevices: ReadonlySet<number>,
    depth: number,
  ): Promise<DirectoryNode | undefined> {
    if (this.request.signal?.aborted === true) return undefined;
    const reused = this.request.alreadyScanned?.get(directory.path.toString());
    if (reused !== undefined) return this.complete(reused, depth, reused.totalSize);
    const listing = await this.limiter.run(() => this.list(directory.path, allowedDevices));
    if (!listing.ok) {
      this.issues.push({ kind: listing.error, path: directory.path });
      return undefined;
    }
    const children = await Promise.all(
      listing.value.subdirectories.map((child) => this.visit(child, allowedDevices, depth + 1)),
    );
    const node = DirectoryNode.assemble({
      path: directory.path,
      identity: identityOf(directory.stats),
      ownFilesSize: listing.value.ownFilesSize,
      ownFileCount: listing.value.ownFileCount,
      ownPersonalFileCount: listing.value.ownPersonalFileCount,
      lastModified: directory.stats.mtime,
      notableFiles: listing.value.notableFiles,
      markerFiles: listing.value.markerFiles,
      children: children.filter(isPresent),
    });
    return this.complete(node, depth, node.ownFilesSize);
  }

  private complete(node: DirectoryNode, depth: number, sizeAdded: ByteSize): DirectoryNode {
    this.reportProgress(node.path, sizeAdded);
    if (depth === TOP_LEVEL_DEPTH) {
      this.events.push({ kind: ScanEventKind.TopLevelFolderCompleted, folder: node });
    }
    return node;
  }

  private async list(
    directory: AbsolutePath,
    allowedDevices: ReadonlySet<number>,
  ): Promise<Result<Listing, ScanIssueKind>> {
    let names: string[];
    try {
      names = await readdir(directory.toString());
    } catch (error) {
      return failure(scanIssueKindFor(error));
    }
    const entries = (
      await Promise.all(names.map((name) => this.statEntry(directory, name)))
    ).filter(isPresent);
    return success(this.summarize(entries, allowedDevices));
  }

  private async statEntry(directory: AbsolutePath, name: string): Promise<Entry | undefined> {
    const path = directory.child(name);
    try {
      return { path, stats: await lstat(path.toString()) };
    } catch (error) {
      this.issues.push({ kind: scanIssueKindFor(error), path });
      return undefined;
    }
  }

  private summarize(entries: readonly Entry[], allowedDevices: ReadonlySet<number>): Listing {
    const subdirectories: Entry[] = [];
    const notableFiles: NotableFile[] = [];
    const markerFiles = new Set<string>();
    let ownFilesSize = ByteSize.zero;
    let ownFileCount = 0;
    let ownPersonalFileCount = 0;

    for (const entry of entries) {
      const { path, stats } = entry;
      if (stats.isDirectory()) {
        if (this.excludedPaths.has(path.toString())) continue;
        if (allowedDevices.has(stats.dev)) subdirectories.push(entry);
        else this.issues.push({ kind: ScanIssueKind.OtherVolumeSkipped, path });
        continue;
      }
      const size = this.sizeCountedOnce(stats);
      ownFilesSize = ownFilesSize.plus(size);
      ownFileCount += 1;
      if (!stats.isFile()) continue;
      if (this.request.markerFileNames.has(path.name)) markerFiles.add(path.name);
      if (this.isPersonalFile(path)) ownPersonalFileCount += 1;
      if (size.isAtLeast(this.request.notableFileMinimumSize)) {
        notableFiles.push({ path, identity: identityOf(stats), size, lastModified: stats.mtime });
      }
    }
    return {
      ownFilesSize,
      ownFileCount,
      ownPersonalFileCount,
      notableFiles,
      markerFiles,
      subdirectories,
    };
  }

  private isPersonalFile(path: AbsolutePath): boolean {
    const { extension } = path;
    return extension !== undefined && this.request.personalFileExtensions.has(extension);
  }

  private sizeCountedOnce(stats: Stats): ByteSize {
    if (stats.nlink > 1) {
      const identity = `${String(stats.dev)}:${String(stats.ino)}`;
      if (this.countedHardLinks.has(identity)) return ByteSize.zero;
      this.countedHardLinks.add(identity);
    }
    return ByteSize.fromAllocatedBlocks(stats.blocks, STAT_BLOCK_UNIT);
  }

  private reportProgress(currentPath: AbsolutePath, sizeAdded: ByteSize): void {
    this.directoriesScanned += 1;
    this.bytesFound += sizeAdded.bytes;
    const now = this.clock.now().getTime();
    if (now - this.lastProgressAt < PROGRESS_INTERVAL_MILLISECONDS) return;
    this.lastProgressAt = now;
    this.events.push({
      kind: ScanEventKind.Progress,
      directoriesScanned: this.directoriesScanned,
      sizeFound: ByteSize.fromBytes(this.bytesFound),
      currentPath,
    });
  }
}

function emptyContents(path: AbsolutePath, lastModified: Date): DirectoryContents {
  return {
    path,
    identity: undefined,
    ownFilesSize: ByteSize.zero,
    ownFileCount: 0,
    ownPersonalFileCount: 0,
    lastModified,
    notableFiles: [],
    markerFiles: new Set<string>(),
    children: [],
  };
}
