import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { z } from "zod";
import type { AbsolutePath } from "../../domain/index.ts";

const DATABASE_FILE_NAME = "whyfull.db";

const MIGRATIONS: readonly string[] = [
  `CREATE TABLE cleanup_journal (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     started_at TEXT NOT NULL,
     action_kind TEXT NOT NULL,
     targets TEXT NOT NULL,
     size_bytes INTEGER NOT NULL,
     finished_at TEXT,
     outcome TEXT,
     detail TEXT
   )`,
  `CREATE TABLE scan_snapshots (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     root TEXT NOT NULL,
     scope_kind TEXT NOT NULL,
     taken_at TEXT NOT NULL,
     total_bytes INTEGER NOT NULL
   );
   CREATE TABLE snapshot_folders (
     snapshot_id INTEGER NOT NULL REFERENCES scan_snapshots(id) ON DELETE CASCADE,
     path TEXT NOT NULL,
     bytes INTEGER NOT NULL
   );
   CREATE INDEX snapshot_lookup ON scan_snapshots(root, scope_kind, taken_at);
   CREATE INDEX snapshot_folders_by_snapshot ON snapshot_folders(snapshot_id);`,
];

const userVersionSchema = z.object({ user_version: z.number().int().nonnegative() });

function migrate(database: Database): void {
  const { user_version: currentVersion } = userVersionSchema.parse(
    database.query("PRAGMA user_version").get(),
  );
  MIGRATIONS.slice(currentVersion).forEach((migration, offset) => {
    const nextVersion = currentVersion + offset + 1;
    database.transaction(() => {
      database.run(migration);
      database.run(`PRAGMA user_version = ${String(nextVersion)}`);
    })();
  });
}

export function openWhyfullDatabase(directory: AbsolutePath): Database {
  mkdirSync(directory.toString(), { recursive: true });
  const database = new Database(directory.child(DATABASE_FILE_NAME).toString(), {
    create: true,
    strict: true,
  });
  database.run("PRAGMA journal_mode = WAL");
  database.run("PRAGMA foreign_keys = ON");
  migrate(database);
  return database;
}

export function openInMemoryDatabase(): Database {
  const database = new Database(":memory:", { strict: true });
  database.run("PRAGMA foreign_keys = ON");
  migrate(database);
  return database;
}
