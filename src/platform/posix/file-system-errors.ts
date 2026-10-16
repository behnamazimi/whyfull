import { ScanIssueKind } from "../../domain/index.ts";

const ErrorCode = {
  AccessDenied: "EACCES",
  NotPermitted: "EPERM",
  NotFound: "ENOENT",
  NotADirectory: "ENOTDIR",
} as const;

const issueKindByErrorCode: ReadonlyMap<string, ScanIssueKind> = new Map([
  [ErrorCode.AccessDenied, ScanIssueKind.PermissionDenied],
  [ErrorCode.NotPermitted, ScanIssueKind.PermissionDenied],
  [ErrorCode.NotFound, ScanIssueKind.Vanished],
  [ErrorCode.NotADirectory, ScanIssueKind.Vanished],
]);

export function errorCodeOf(error: unknown): string | undefined {
  if (!(error instanceof Error) || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

export function scanIssueKindFor(error: unknown): ScanIssueKind {
  const code = errorCodeOf(error);
  return (
    (code === undefined ? undefined : issueKindByErrorCode.get(code)) ?? ScanIssueKind.Unreadable
  );
}
