import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  ByteSize,
  CleanupActionKind,
  OutcomeKind,
  type ApprovedPathAction,
} from "../../src/domain/index.ts";
import { openInMemoryDatabase, SqliteCleanupJournal } from "../../src/infrastructure/index.ts";
import { pathOf, REFERENCE_DATE } from "../support/domain-builders.ts";
import { homebrewCacheRule } from "../support/sample-rules.ts";

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

    journal.recordOutcome(entry, { action, outcome: OutcomeKind.Done, detail: undefined });
    expect(readRow()).toEqual({
      action_kind: CleanupActionKind.Delete,
      targets: JSON.stringify(["/Users/sam/Library/Caches/Homebrew"]),
      size_bytes: ByteSize.fromGigabytes(1).bytes,
      outcome: OutcomeKind.Done,
    });
  });
});
