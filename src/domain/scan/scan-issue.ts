import type { AbsolutePath } from "../path/absolute-path.ts";

export const ScanIssueKind = {
  PermissionDenied: "permission-denied",
  Vanished: "vanished",
  OtherVolumeSkipped: "other-volume-skipped",
  Unreadable: "unreadable",
} as const;
export type ScanIssueKind = (typeof ScanIssueKind)[keyof typeof ScanIssueKind];

export interface ScanIssue {
  readonly kind: ScanIssueKind;
  readonly path: AbsolutePath;
}
