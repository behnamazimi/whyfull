import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  ByteSize,
  CleanupActionKind,
  OutcomeKind,
  type ApprovedPathAction,
  type HighRiskAction,
} from "../../src/domain/index.ts";
import { openInMemoryDatabase, SqliteCleanupJournal } from "../../src/infrastructure/index.ts";
import { pathOf, REFERENCE_DATE } from "../support/domain-builders.ts";
import { homebrewCacheRule } from "../support/sample-rules.ts";

const HIGH_RISK_FILE_COUNT = 12;
const PARTLY_FREED_MEGABYTES = 400;

const rowSchema = z.object({
  action_kind: z.string(),
  targets: z.string(),
  size_bytes: z.number(),
  outcome: z.string().nullable(),
});

describe("SqliteCleanupJournal", () => {
  test("records the intent first and the outcome after", () => {
    const database = openInMemoryDatabase();
    const journal = new SqliteCleanupJournal(database, { now: () => REFERENCE_DATE });
    const action: ApprovedPathAction = {
      kind: CleanupActionKind.Delete,
      path: pathOf("/Users/sam/Library/Caches/Homebrew"),
      rule: homebrewCacheRule,
      size: ByteSize.fromGigabytes(1),
      identity: { device: 1, inode: 2, isSymbolicLink: false },
    };
    const readRow = () => rowSchema.parse(database.query("SELECT * FROM cleanup_journal").get());

    const entry = journal.recordIntent(action);
    expect(readRow().outcome).toBeNull();

    journal.recordOutcome(entry, {
      action,
      outcome: OutcomeKind.Done,
      detail: undefined,
      freed: action.size,
    });
    expect(readRow()).toEqual({
      action_kind: CleanupActionKind.Delete,
      targets: JSON.stringify(["/Users/sam/Library/Caches/Homebrew"]),
      size_bytes: ByteSize.fromGigabytes(1).bytes,
      outcome: OutcomeKind.Done,
    });
  });

  test("marks high-risk deletions with their file count and what they freed", () => {
    const database = openInMemoryDatabase();
    const journal = new SqliteCleanupJournal(database, { now: () => REFERENCE_DATE });
    const action: HighRiskAction = {
      kind: CleanupActionKind.DeleteHighRisk,
      path: pathOf("/Users/sam/VMs"),
      size: ByteSize.fromGigabytes(1),
      fileCount: HIGH_RISK_FILE_COUNT,
      scannedIdentity: { device: 1, inode: 2, isSymbolicLink: false },
      rule: undefined,
    };
    const freed = ByteSize.fromMegabytes(PARTLY_FREED_MEGABYTES);
    const entry = journal.recordIntent(action);
    journal.recordOutcome(entry, {
      action,
      outcome: OutcomeKind.PartlyDeleted,
      detail: "locked",
      freed,
    });
    expect(
      database
        .query("SELECT high_risk, file_count, freed_bytes, outcome FROM cleanup_journal")
        .get(),
    ).toEqual({
      high_risk: 1,
      file_count: HIGH_RISK_FILE_COUNT,
      freed_bytes: freed.bytes,
      outcome: OutcomeKind.PartlyDeleted,
    });
  });

  test("logs when high-risk mode is turned on and off", () => {
    const database = openInMemoryDatabase();
    const journal = new SqliteCleanupJournal(database, { now: () => REFERENCE_DATE });
    journal.recordHighRiskMode(true);
    journal.recordHighRiskMode(false);
    expect(
      database.query("SELECT changed_at, turned_on FROM high_risk_mode_log ORDER BY id").all(),
    ).toEqual([
      { changed_at: REFERENCE_DATE.toISOString(), turned_on: 1 },
      { changed_at: REFERENCE_DATE.toISOString(), turned_on: 0 },
    ]);
  });
});
