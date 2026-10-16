import type { Database } from "bun:sqlite";
import { z } from "zod";
import type { SnapshotRepository } from "../../application/index.ts";
import {
  AbsolutePath,
  ByteSize,
  ScanScopeKind,
  type ScanScopeKind as ScopeKind,
  type SnapshotSummary,
} from "../../domain/index.ts";

const snapshotRowSchema = z.object({
  id: z.number().int().positive(),
  taken_at: z.iso.datetime(),
  total_bytes: z.number().int().nonnegative(),
});

const folderRowSchema = z.object({
  path: z.string(),
  bytes: z.number().int().nonnegative(),
});

const insertedRowSchema = z.object({ id: z.number().int().positive() });

const scopeKindSchema = z.enum([ScanScopeKind.Folder, ScanScopeKind.WholeDisk]);

export class SqliteSnapshotRepository implements SnapshotRepository {
  constructor(private readonly database: Database) {}

  latestFor(root: AbsolutePath, scopeKind: ScopeKind): SnapshotSummary | undefined {
    const row = this.database
      .query(
        `SELECT id, taken_at, total_bytes FROM scan_snapshots
         WHERE root = $root AND scope_kind = $scopeKind
         ORDER BY taken_at DESC LIMIT 1`,
      )
      .get({ root: root.toString(), scopeKind });
    if (row === null) return undefined;
    const snapshot = snapshotRowSchema.parse(row);
    const folders = z
      .array(folderRowSchema)
      .parse(
        this.database
          .query("SELECT path, bytes FROM snapshot_folders WHERE snapshot_id = $id")
          .all({ id: snapshot.id }),
      )
      .flatMap((folder) => {
        const path = AbsolutePath.parse(folder.path);
        return path.ok ? [{ path: path.value, size: ByteSize.fromBytes(folder.bytes) }] : [];
      });
    return {
      root,
      scopeKind: scopeKindSchema.parse(scopeKind),
      takenAt: new Date(snapshot.taken_at),
      totalSize: ByteSize.fromBytes(snapshot.total_bytes),
      folders,
    };
  }

  save(summary: SnapshotSummary, keepLatest: number): void {
    this.database.transaction(() => {
      const inserted = insertedRowSchema.parse(
        this.database
          .query(
            `INSERT INTO scan_snapshots (root, scope_kind, taken_at, total_bytes)
             VALUES ($root, $scopeKind, $takenAt, $totalBytes) RETURNING id`,
          )
          .get({
            root: summary.root.toString(),
            scopeKind: summary.scopeKind,
            takenAt: summary.takenAt.toISOString(),
            totalBytes: summary.totalSize.bytes,
          }),
      );
      const insertFolder = this.database.query(
        "INSERT INTO snapshot_folders (snapshot_id, path, bytes) VALUES ($id, $path, $bytes)",
      );
      for (const folder of summary.folders) {
        insertFolder.run({
          id: inserted.id,
          path: folder.path.toString(),
          bytes: folder.size.bytes,
        });
      }
      this.database
        .query(
          `DELETE FROM scan_snapshots WHERE root = $root AND scope_kind = $scopeKind AND id NOT IN (
             SELECT id FROM scan_snapshots WHERE root = $root AND scope_kind = $scopeKind
             ORDER BY taken_at DESC LIMIT $keep)`,
        )
        .run({ root: summary.root.toString(), scopeKind: summary.scopeKind, keep: keepLatest });
    })();
  }
}
