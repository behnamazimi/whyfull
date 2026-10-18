import type { Database } from "bun:sqlite";
import { z } from "zod";
import type { CleanupJournal, Clock, JournalEntryId } from "../../application/index.ts";
import {
  assertNever,
  CleanupActionKind,
  pathsOf,
  type ActionResult,
  type ApprovedAction,
} from "../../domain/index.ts";

const insertedRowSchema = z.object({ id: z.number().int().positive() });

const SQL_TRUE = 1;
const SQL_FALSE = 0;

const sqlBoolean = (value: boolean): number => (value ? SQL_TRUE : SQL_FALSE);

function describeAction(action: ApprovedAction): string {
  switch (action.kind) {
    case CleanupActionKind.RunOwnerTool:
      return `${action.kind}:${action.tool}`;
    case CleanupActionKind.Delete:
    case CleanupActionKind.MoveToTrash:
    case CleanupActionKind.EmptyTrash:
    case CleanupActionKind.DeleteHighRisk:
      return action.kind;
    default:
      return assertNever(action);
  }
}

export class SqliteCleanupJournal implements CleanupJournal {
  constructor(
    private readonly database: Database,
    private readonly clock: Clock,
  ) {}

  recordIntent(action: ApprovedAction): JournalEntryId {
    const row = this.database
      .query(
        `INSERT INTO cleanup_journal
           (started_at, action_kind, targets, size_bytes, high_risk, file_count)
         VALUES ($startedAt, $actionKind, $targets, $sizeBytes, $highRisk, $fileCount)
         RETURNING id`,
      )
      .get({
        startedAt: this.clock.now().toISOString(),
        actionKind: describeAction(action),
        targets: JSON.stringify(pathsOf(action).map((path) => path.toString())),
        sizeBytes: action.size.bytes,
        highRisk: sqlBoolean(action.kind === CleanupActionKind.DeleteHighRisk),
        fileCount: action.kind === CleanupActionKind.DeleteHighRisk ? action.fileCount : null,
      });
    return insertedRowSchema.parse(row).id;
  }

  recordOutcome(entry: JournalEntryId, result: ActionResult): void {
    this.database
      .query(
        `UPDATE cleanup_journal
         SET finished_at = $finishedAt, outcome = $outcome, detail = $detail,
             freed_bytes = $freedBytes
         WHERE id = $id`,
      )
      .run({
        id: entry,
        finishedAt: this.clock.now().toISOString(),
        outcome: result.outcome,
        detail: result.detail ?? null,
        freedBytes: result.freed.bytes,
      });
  }

  recordHighRiskMode(turnedOn: boolean): void {
    this.database
      .query(
        `INSERT INTO high_risk_mode_log (changed_at, turned_on) VALUES ($changedAt, $turnedOn)`,
      )
      .run({ changedAt: this.clock.now().toISOString(), turnedOn: sqlBoolean(turnedOn) });
  }
}
