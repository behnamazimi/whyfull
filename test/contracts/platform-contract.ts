import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { lstat } from "node:fs/promises";
import { join } from "node:path";
import { ScanEventKind, type ScanEvent } from "../../src/application/index.ts";
import {
  ByteSize,
  ScanIssueKind,
  type DirectoryNode,
  type ScanSnapshot,
} from "../../src/domain/index.ts";
import { bunCommandRunner, systemClock } from "../../src/infrastructure/index.ts";
import type { PlatformFactory } from "../../src/platform/index.ts";
import {
  createFixtureTree,
  FIXTURE_NOTABLE_THRESHOLD_BYTES,
  FIXTURE_SPARSE_LOGICAL_BYTES,
  FixtureEntry,
  type FixtureTree,
} from "../fixtures/fixture-tree.ts";
import { pathOf } from "../support/domain-builders.ts";

const STAT_BLOCK_UNIT_BYTES = 512;
const SPARSE_ALLOWANCE_DIVISOR = 1000;

async function collect(events: AsyncIterable<ScanEvent>): Promise<ScanEvent[]> {
  const collected: ScanEvent[] = [];
  for await (const event of events) collected.push(event);
  return collected;
}

function childNamed(node: DirectoryNode, name: string): DirectoryNode {
  const child = node.children.find((candidate) => candidate.name === name);
  if (child === undefined) throw new Error(`Missing ${name} in ${node.path.toString()}`);
  return child;
}

export function describePlatformContract(name: string, createPlatform: PlatformFactory): void {
  describe(`${name} platform contract`, () => {
    let fixture: FixtureTree;
    let events: ScanEvent[];
    let snapshot: ScanSnapshot;

    beforeAll(async () => {
      fixture = await createFixtureTree();
      const platform = createPlatform({
        home: pathOf(fixture.root),
        clock: systemClock,
        commands: bunCommandRunner,
      });
      events = await collect(
        platform.scanner.scan({
          root: pathOf(fixture.root),
          markerFileNames: new Set([FixtureEntry.ProjectManifest]),
          notableFileMinimumSize: ByteSize.fromBytes(FIXTURE_NOTABLE_THRESHOLD_BYTES),
        }),
      );
      const finished = events.find((event) => event.kind === ScanEventKind.Finished);
      if (finished === undefined) throw new Error("Scan did not finish");
      snapshot = finished.snapshot;
    });

    afterAll(async () => {
      await fixture.remove();
    });

    test("counts a hard-linked file once", async () => {
      const report = await lstat(join(fixture.root, FixtureEntry.Documents, FixtureEntry.Report));
      expect(childNamed(snapshot.root, FixtureEntry.Documents).totalSize.bytes).toBe(
        report.blocks * STAT_BLOCK_UNIT_BYTES,
      );
    });

    test("measures sparse files by allocated space, not length", () => {
      const sparse = childNamed(snapshot.root, FixtureEntry.Sparse);
      expect(sparse.totalSize.bytes).toBeLessThan(
        FIXTURE_SPARSE_LOGICAL_BYTES / SPARSE_ALLOWANCE_DIVISOR,
      );
    });

    test("does not follow symbolic links", () => {
      expect(childNamed(snapshot.root, FixtureEntry.Loop).children).toHaveLength(0);
    });

    test.skipIf(process.getuid?.() === 0)("records unreadable folders as issues", () => {
      const lockedPath = pathOf(join(fixture.root, FixtureEntry.Locked));
      expect(snapshot.issues).toContainEqual({
        kind: ScanIssueKind.PermissionDenied,
        path: lockedPath,
      });
    });

    test("records requested marker files", () => {
      expect(childNamed(snapshot.root, FixtureEntry.Project).markerFiles).toContain(
        FixtureEntry.ProjectManifest,
      );
    });

    test("keeps files above the notable threshold", () => {
      const media = childNamed(snapshot.root, FixtureEntry.Media);
      expect(media.notableFiles.map((file) => file.path.name)).toEqual([FixtureEntry.BigFile]);
    });

    test("announces each top-level folder as it completes", () => {
      const completed = events.flatMap((event) =>
        event.kind === ScanEventKind.TopLevelFolderCompleted ? [event.folder.name] : [],
      );
      expect(completed.sort()).toEqual(snapshot.root.children.map((child) => child.name).sort());
    });

    test("reports volume usage for the scanned path", async () => {
      const platform = createPlatform({
        home: pathOf(fixture.root),
        clock: systemClock,
        commands: bunCommandRunner,
      });
      const usage = await platform.volumes.usageOf(pathOf(fixture.root));
      expect(usage.ok && usage.value.capacity.isLargerThan(usage.value.used)).toBe(true);
    });
  });
}
