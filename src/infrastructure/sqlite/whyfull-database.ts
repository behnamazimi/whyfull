import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, renameSync } from "node:fs";
import { z } from "zod";
import type { AbsolutePath } from "../../domain/index.ts";

const DATABASE_FILE_NAME = "whyfull.db";
const ASIDE_LABEL = "other-version";

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
  `ALTER TABLE cleanup_journal ADD COLUMN high_risk INTEGER NOT NULL DEFAULT 0;
   ALTER TABLE cleanup_journal ADD COLUMN file_count INTEGER;
   ALTER TABLE cleanup_journal ADD COLUMN freed_bytes INTEGER;
   CREATE TABLE high_risk_mode_log (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     changed_at TEXT NOT NULL,
     turned_on INTEGER NOT NULL
   );`,
];

const userVersionSchema = z.object({ user_version: z.number().int().nonnegative() });
const tableSchema = z.array(z.object({ name: z.string() }));
const columnSchema = z.array(
  z.object({ name: z.string(), type: z.string(), notnull: z.number(), pk: z.number() }),
);

const versionOf = (database: Database): number =>
  userVersionSchema.parse(database.query("PRAGMA user_version").get()).user_version;

function migrate(database: Database): void {
  const currentVersion = versionOf(database);
  MIGRATIONS.slice(currentVersion).forEach((migration, offset) => {
    const nextVersion = currentVersion + offset + 1;
    database.transaction(() => {
      database.run(migration);
      database.run(`PRAGMA user_version = ${String(nextVersion)}`);
    })();
  });
}

/** Every table with its columns. Two files with the same version number can still differ. */
function schemaOf(database: Database): string {
  const tables = tableSchema.parse(
    database
      .query(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
      )
      .all(),
  );
  return JSON.stringify(
    tables.map((table) => [
      table.name,
      columnSchema
        .parse(
          database
            .query(`SELECT name, type, "notnull", pk FROM pragma_table_info($table) ORDER BY cid`)
            .all({ table: table.name }),
        )
        .map((column) => [column.name, column.type, column.notnull, column.pk]),
    ]),
  );
}

function freshSchema(): string {
  const database = new Database(":memory:", { strict: true });
  try {
    migrate(database);
    return schemaOf(database);
  } finally {
    database.close();
  }
}

/**
 * A file written by a newer whyfull, or by another build whose migrations differ, can't be
 * trusted. The version number alone can't tell, so the finished schema is compared too.
 */
function isUsable(database: Database, expectedSchema: string): boolean {
  if (versionOf(database) > MIGRATIONS.length) return false;
  migrate(database);
  return schemaOf(database) === expectedSchema;
}

function openFile(file: string): Database {
  const database = new Database(file, { create: true, strict: true });
  database.run("PRAGMA journal_mode = WAL");
  database.run("PRAGMA foreign_keys = ON");
  return database;
}

/** SQLite errors on a foreign or damaged file are expected here, so they mean "not usable". */
function openIfUsable(file: string, expectedSchema: string): Database | undefined {
  let database: Database | undefined;
  try {
    database = openFile(file);
    if (isUsable(database, expectedSchema)) return database;
  } catch {
    // Falls through to closing the file and setting it aside.
  }
  database?.close();
  return undefined;
}

const SETTING_ASIDE_SUFFIXES = ["", "-wal", "-shm"] as const;

/** Moves the file, and its write-ahead sidecars, out of the way without deleting anything. */
function moveAside(directory: AbsolutePath, now: Date): AbsolutePath {
  const stamp = now.toISOString().replaceAll(":", "-");
  const original = directory.child(DATABASE_FILE_NAME);
  const aside = directory.child(`${DATABASE_FILE_NAME}.${ASIDE_LABEL}-${stamp}`);
  for (const suffix of SETTING_ASIDE_SUFFIXES) {
    const from = `${original.toString()}${suffix}`;
    if (existsSync(from)) renameSync(from, `${aside.toString()}${suffix}`);
  }
  return aside;
}

export interface OpenedDatabase {
  readonly database: Database;
  /** Where the previous file went, when it came from a different version and was replaced. */
  readonly setAside: AbsolutePath | undefined;
}

export function openWhyfullDatabase(directory: AbsolutePath, now: Date): OpenedDatabase {
  mkdirSync(directory.toString(), { recursive: true });
  const file = directory.child(DATABASE_FILE_NAME).toString();
  const expectedSchema = freshSchema();
  const existing = openIfUsable(file, expectedSchema);
  if (existing !== undefined) return { database: existing, setAside: undefined };
  const setAside = moveAside(directory, now);
  const database = openFile(file);
  migrate(database);
  return { database, setAside };
}

export function openInMemoryDatabase(): Database {
  const database = new Database(":memory:", { strict: true });
  database.run("PRAGMA foreign_keys = ON");
  migrate(database);
  return database;
}
