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
  migrate(database);
  return database;
}

export function openInMemoryDatabase(): Database {
  const database = new Database(":memory:", { strict: true });
  migrate(database);
  return database;
}
