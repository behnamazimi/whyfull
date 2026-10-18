import type { DiagnosisReport } from "../../application/index.ts";
import {
  FindingKind,
  ScanIssueKind,
  type AbsolutePath,
  type Finding,
  type SnapshotDiff,
} from "../../domain/index.ts";
import { ruleCopy } from "../copy/rule-copy.ts";
import { ruleTag } from "../copy/rule-labels.ts";
import { UiCopy } from "../copy/ui-copy.ts";
import { formatByteSize } from "../format/byte-size-format.ts";
import { formatCount } from "../format/count-format.ts";
import { formatPath } from "../format/path-format.ts";
import { growthLine } from "../tui/view-models/growth-view.ts";
import { padSize } from "../tui/view-models/layout.ts";

const JSON_INDENT = 2;
const COLUMN_GAP = "  ";

const findingTitle = (finding: Finding, home: AbsolutePath): string =>
  finding.kind === FindingKind.KnownItem
    ? ruleCopy[finding.rule.id].title
    : formatPath(finding.path, home);

const findingLabel = (finding: Finding): string =>
  finding.kind === FindingKind.KnownItem ? ruleTag(finding.rule) : UiCopy.unexplainedLabel;

const findingPaths = (finding: Finding, home: AbsolutePath): readonly string[] =>
  finding.kind === FindingKind.KnownItem
    ? finding.locations.map((location) => formatPath(location.path, home))
    : [formatPath(finding.path, home)];

const unreadableFolderCount = (report: DiagnosisReport): number =>
  report.snapshot.issues.filter((issue) => issue.kind === ScanIssueKind.PermissionDenied).length;

export function renderTextReport(
  report: DiagnosisReport,
  home: AbsolutePath,
  growth: SnapshotDiff | undefined,
  now: Date,
): string {
  const { root } = report.snapshot;
  const unreadable = unreadableFolderCount(report);
  const grownFolders = (growth?.grownFolders ?? []).map(
    (folder) =>
      `${padSize(UiCopy.growth.changes.grew(formatByteSize(folder.growth)))}${COLUMN_GAP}${formatPath(folder.path, home)}`,
  );
  return [
    UiCopy.report.scanRoot(formatPath(root.path, home)),
    `${formatByteSize(root.totalSize)} in ${formatCount(root.fileCount)} files`,
    ...(growth === undefined ? [] : [growthLine(growth, now), ...grownFolders]),
    "",
    UiCopy.report.title,
    ...report.findings.map((finding) =>
      [
        padSize(formatByteSize(finding.size)),
        findingTitle(finding, home),
        `(${findingLabel(finding)})`,
      ].join(COLUMN_GAP),
    ),
    ...(unreadable === 0 ? [] : ["", UiCopy.diagnosis.issues(unreadable)]),
  ].join("\n");
}

export function renderJsonReport(
  report: DiagnosisReport,
  home: AbsolutePath,
  growth: SnapshotDiff | undefined,
): string {
  const { root } = report.snapshot;
  return JSON.stringify(
    {
      // Paths start with ~ so a shared report doesn't carry the person's account name.
      scannedFolder: formatPath(root.path, home),
      totalBytes: root.totalSize.bytes,
      fileCount: root.fileCount,
      unreadableFolderCount: unreadableFolderCount(report),
      sinceLastScan:
        growth === undefined
          ? null
          : {
              previousScanAt: growth.previousTakenAt.toISOString(),
              direction: growth.total.direction,
              bytes: growth.total.amount.bytes,
              grownFolders: growth.grownFolders.map((folder) => ({
                path: formatPath(folder.path, home),
                grewBytes: folder.growth.bytes,
              })),
            },
      findings: report.findings.map((finding) => ({
        kind: finding.kind,
        ruleId: finding.kind === FindingKind.KnownItem ? finding.rule.id : null,
        title: findingTitle(finding, home),
        safety: findingLabel(finding),
        bytes: finding.size.bytes,
        paths: findingPaths(finding, home),
      })),
    },
    undefined,
    JSON_INDENT,
  );
}
