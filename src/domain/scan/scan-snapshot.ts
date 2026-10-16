import type { DirectoryNode } from "./directory-node.ts";
import type { ScanIssue } from "./scan-issue.ts";

export interface ScanSnapshot {
  readonly root: DirectoryNode;
  readonly issues: readonly ScanIssue[];
  readonly startedAt: Date;
  readonly finishedAt: Date;
}
