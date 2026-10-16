import type { AbsolutePath, ScanScopeKind, SnapshotSummary } from "../../domain/index.ts";

export interface SnapshotRepository {
  latestFor(root: AbsolutePath, scopeKind: ScanScopeKind): SnapshotSummary | undefined;
  save(summary: SnapshotSummary, keepLatest: number): void;
}
