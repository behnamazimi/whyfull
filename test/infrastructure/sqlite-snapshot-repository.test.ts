import { describe, expect, test } from "bun:test";
import { ByteSize, ScanScopeKind, type SnapshotSummary } from "../../src/domain/index.ts";
import { openInMemoryDatabase, SqliteSnapshotRepository } from "../../src/infrastructure/index.ts";
import { pathOf } from "../support/domain-builders.ts";

const summaryAt = (iso: string, gigabytes: number): SnapshotSummary => ({
  root: pathOf("/Users/sam"),
  scopeKind: ScanScopeKind.Folder,
  takenAt: new Date(iso),
  totalSize: ByteSize.fromGigabytes(gigabytes),
  folders: [{ path: pathOf("/Users/sam/Movies"), size: ByteSize.fromGigabytes(gigabytes) }],
});

describe("SqliteSnapshotRepository", () => {
  test("returns the latest snapshot and keeps only the newest ones", () => {
    const database = openInMemoryDatabase();
    const repository = new SqliteSnapshotRepository(database);
    repository.save(summaryAt("2026-10-01T00:00:00.000Z", 1), 2);
    repository.save(summaryAt("2026-10-02T00:00:00.000Z", 2), 2);
    repository.save(summaryAt("2026-10-03T00:00:00.000Z", 3), 2);
    expect(repository.latestFor(pathOf("/Users/sam"), ScanScopeKind.Folder)).toEqual(
      summaryAt("2026-10-03T00:00:00.000Z", 3),
    );
    expect(repository.latestFor(pathOf("/Users/sam"), ScanScopeKind.WholeDisk)).toBeUndefined();
    expect(database.query("SELECT id FROM scan_snapshots").all()).toHaveLength(2);
    expect(database.query("SELECT path FROM snapshot_folders").all()).toHaveLength(2);
  });
});
