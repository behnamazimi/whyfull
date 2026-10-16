import type { DiagnosisReport } from "../../application/index.ts";
import { FindingKind, ScanIssueKind, type AbsolutePath, type Finding } from "../../domain/index.ts";
import { ruleCopy } from "../copy/rule-copy.ts";
import { UiCopy } from "../copy/ui-copy.ts";
import { formatByteSize } from "../format/byte-size-format.ts";
import { formatCount } from "../format/count-format.ts";
import { formatPath } from "../format/path-format.ts";
import { padSize } from "../tui/view-models/layout.ts";

const JSON_INDENT = 2;
const COLUMN_GAP = "  ";

const findingTitle = (finding: Finding, home: AbsolutePath): string =>
  finding.kind === FindingKind.KnownItem
    ? ruleCopy[finding.rule.id].title
    : formatPath(finding.path, home);

const findingLabel = (finding: Finding): string =>
  finding.kind === FindingKind.KnownItem
    ? UiCopy.safety[finding.rule.safety]
    : UiCopy.unexplainedLabel;

const findingPaths = (finding: Finding): readonly string[] =>
  finding.kind === FindingKind.KnownItem
    ? finding.locations.map((location) => location.path.toString())
    : [finding.path.toString()];

const unreadableFolderCount = (report: DiagnosisReport): number =>
  report.snapshot.issues.filter((issue) => issue.kind === ScanIssueKind.PermissionDenied).length;

export function renderTextReport(report: DiagnosisReport, home: AbsolutePath): string {
  const { root } = report.snapshot;
  const unreadable = unreadableFolderCount(report);
  return [
    UiCopy.scanRoot(formatPath(root.path, home)),
    `${formatByteSize(root.totalSize)} in ${formatCount(root.fileCount)} files`,
    "",
    UiCopy.diagnosis.title,
    ...report.findings.map((finding) =>
      [
        padSize(formatByteSize(finding.size)),
        findingTitle(finding, home),
        `(${findingLabel(finding)})`,
      ].join(COLUMN_GAP),
    ),
    ...(unreadable === 0 ? [] : ["", UiCopy.diagnosis.issues(formatCount(unreadable))]),
  ].join("\n");
}

export function renderJsonReport(report: DiagnosisReport, home: AbsolutePath): string {
  const { root } = report.snapshot;
  return JSON.stringify(
    {
      scannedFolder: root.path.toString(),
      totalBytes: root.totalSize.bytes,
      fileCount: root.fileCount,
      unreadableFolderCount: unreadableFolderCount(report),
      findings: report.findings.map((finding) => ({
        kind: finding.kind,
        ruleId: finding.kind === FindingKind.KnownItem ? finding.rule.id : null,
        title: findingTitle(finding, home),
        safety: findingLabel(finding),
        bytes: finding.size.bytes,
        paths: findingPaths(finding),
      })),
    },
    undefined,
    JSON_INDENT,
  );
}
