import type { Database } from "bun:sqlite";
import { z } from "zod";
import type { CleanupJournal, Clock, JournalEntryId } from "../../application/index.ts";
import {
  CleanupActionKind,
  pathsOf,
  type ActionResult,
  type ApprovedAction,
} from "../../domain/index.ts";

const insertedRowSchema = z.object({ id: z.number().int().positive() });

const describeAction = (action: ApprovedAction): string =>
  action.kind === CleanupActionKind.RunOwnerTool ? `${action.kind}:${action.tool}` : action.kind;

export class SqliteCleanupJournal implements CleanupJournal {
  constructor(
    private readonly database: Database,
    private readonly clock: Clock,
  ) {}

  recordIntent(action: ApprovedAction): JournalEntryId {
    const row = this.database
      .query(
        `INSERT INTO cleanup_journal (started_at, action_kind, targets, size_bytes)
         VALUES ($startedAt, $actionKind, $targets, $sizeBytes)
         RETURNING id`,
      )
      .get({
        startedAt: this.clock.now().toISOString(),
        actionKind: describeAction(action),
        targets: JSON.stringify(pathsOf(action).map((path) => path.toString())),
        sizeBytes: action.size.bytes,
      });
    return insertedRowSchema.parse(row).id;
  }

  recordOutcome(entry: JournalEntryId, result: ActionResult): void {
    this.database
      .query(
        `UPDATE cleanup_journal
         SET finished_at = $finishedAt, outcome = $outcome, detail = $detail
         WHERE id = $id`,
      )
      .run({
        id: entry,
        finishedAt: this.clock.now().toISOString(),
        outcome: result.outcome,
        detail: result.detail ?? null,
      });
  }
}
