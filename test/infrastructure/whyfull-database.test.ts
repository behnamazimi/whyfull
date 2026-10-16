import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { AbsolutePath } from "../../src/domain/index.ts";
import { openWhyfullDatabase } from "../../src/infrastructure/index.ts";
import { REFERENCE_DATE } from "../support/domain-builders.ts";

const NEWER_VERSION = 99;
const FIRST_VERSION = 1;
const SECOND_VERSION = 2;
const DATABASE_FILE = "whyfull.db";

const columnNames = z.array(z.object({ name: z.string() }));

let folder: string;
let directory: AbsolutePath;

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "whyfull-db-"));
  const parsed = AbsolutePath.parse(folder);
  if (!parsed.ok) throw new Error("the temporary folder must be an absolute path");
  directory = parsed.value;
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

const columnsOf = (file: string, table: string): readonly string[] => {
  const database = new Database(file, { readonly: true });
  const names = columnNames
    .parse(database.query(`SELECT name FROM pragma_table_info('${table}')`).all())
    .map((column) => column.name);
  database.close();
  return names;
};

function writeDatabase(setUp: (database: Database) => void): void {
  const database = new Database(join(folder, DATABASE_FILE), { create: true });
  setUp(database);
  database.close();
}

const openAgain = () => openWhyfullDatabase(directory, REFERENCE_DATE);

describe("opening the whyfull database", () => {
  test("creates a new file when there is none", () => {
    const opened = openAgain();
    expect(opened.setAside).toBeUndefined();
    opened.database.close();
  });

  test("keeps a file from the same version, with its rows", () => {
    const first = openAgain();
    first.database.run(
      `INSERT INTO high_risk_mode_log (changed_at, turned_on) VALUES ('2026-10-01', 1)`,
    );
    first.database.close();
    const second = openAgain();
    expect(second.setAside).toBeUndefined();
    expect(second.database.query("SELECT id FROM high_risk_mode_log").all()).toHaveLength(1);
    second.database.close();
  });

  test("upgrades a file from an older version without setting it aside", () => {
    writeDatabase((database) => {
      database.run(
        `CREATE TABLE cleanup_journal (
           id INTEGER PRIMARY KEY AUTOINCREMENT, started_at TEXT NOT NULL,
           action_kind TEXT NOT NULL, targets TEXT NOT NULL, size_bytes INTEGER NOT NULL,
           finished_at TEXT, outcome TEXT, detail TEXT)`,
      );
      database.run(`PRAGMA user_version = ${String(FIRST_VERSION)}`);
    });
    const opened = openAgain();
    expect(opened.setAside).toBeUndefined();
    expect(opened.database.query("SELECT id FROM high_risk_mode_log").all()).toEqual([]);
    opened.database.close();
  });

  test("sets aside a file from a newer version and starts a new one", () => {
    writeDatabase((database) => {
      database.run("CREATE TABLE from_the_future (id INTEGER)");
      database.run(`PRAGMA user_version = ${String(NEWER_VERSION)}`);
    });
    const opened = openAgain();
    expect(opened.setAside).toBeDefined();
    expect(existsSync(opened.setAside?.toString() ?? "")).toBe(true);
    expect(columnsOf(opened.setAside?.toString() ?? "", "from_the_future")).toEqual(["id"]);
    opened.database.close();
  });

  test("sets aside a file whose version matches but whose tables differ", () => {
    writeDatabase((database) => {
      database.run(
        `CREATE TABLE cleanup_journal (
           id INTEGER PRIMARY KEY AUTOINCREMENT, started_at TEXT NOT NULL,
           action_kind TEXT NOT NULL, targets TEXT NOT NULL, size_bytes INTEGER NOT NULL,
           finished_at TEXT, outcome TEXT, detail TEXT, origin TEXT NOT NULL DEFAULT 'rule')`,
      );
      database.run(`PRAGMA user_version = ${String(SECOND_VERSION + FIRST_VERSION)}`);
    });
    const opened = openAgain();
    expect(opened.setAside).toBeDefined();
    expect(columnsOf(opened.setAside?.toString() ?? "", "cleanup_journal")).toContain("origin");
    expect(columnsOf(join(folder, DATABASE_FILE), "cleanup_journal")).toContain("high_risk");
    opened.database.close();
  });

  test("sets aside a file that isn't a database", () => {
    writeFileSync(join(folder, DATABASE_FILE), "this is not a database file at all");
    const opened = openAgain();
    const aside = opened.setAside?.toString() ?? "";
    expect(readFileSync(aside, "utf8")).toContain("not a database");
    opened.database.close();
  });
});
