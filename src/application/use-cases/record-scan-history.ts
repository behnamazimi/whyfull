import {
  compareSnapshots,
  summarizeSnapshot,
  type HistoryPolicy,
  type ScanScope,
  type ScanSnapshot,
  type SnapshotDiff,
} from "../../domain/index.ts";
import type { SnapshotRepository } from "../ports/snapshot-repository.ts";

export class RecordScanHistory {
  constructor(
    private readonly repository: SnapshotRepository,
    private readonly policy: HistoryPolicy,
  ) {}

  recordAndCompare(snapshot: ScanSnapshot, scope: ScanScope): SnapshotDiff | undefined {
    const current = summarizeSnapshot({
      root: snapshot.root,
      scopeKind: scope.kind,
      takenAt: snapshot.finishedAt,
      policy: this.policy,
    });
    const previous = this.repository.latestFor(current.root, current.scopeKind);
    this.repository.save(current, this.policy.snapshotsKept);
    return previous === undefined ? undefined : compareSnapshots(previous, current, this.policy);
  }
}
