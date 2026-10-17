import {
  AbsolutePath,
  defaultCleanupPolicy,
  defaultDiagnosisPolicy,
  defaultHistoryPolicy,
  defaultScanPolicy,
  folderScope,
  KnownFolderId,
  ScanScopeKind,
  type ScanScope,
} from "../../src/domain/index.ts";
import type { AppContext } from "../../src/presentation/tui/state/app-state.ts";
import { SAMPLE_HOME } from "./report-builder.ts";
import { sampleHighRiskLimits, sampleProtectedLocations } from "./sample-high-risk-limits.ts";

export const sampleWholeDiskScope: ScanScope = {
  kind: ScanScopeKind.WholeDisk,
  root: AbsolutePath.root,
  volumesOf: [],
  excludedPaths: [],
};

export const sampleKnownFolders: AppContext["knownFolders"] = [
  { id: KnownFolderId.Library, path: SAMPLE_HOME.child("Library") },
  { id: KnownFolderId.Downloads, path: SAMPLE_HOME.child("Downloads") },
];

export const sampleAppContext: AppContext = {
  home: SAMPLE_HOME,
  initialScope: folderScope(SAMPLE_HOME),
  wholeDiskScope: sampleWholeDiskScope,
  systemDescription: "macOS 26.0",
  scanPolicy: defaultScanPolicy,
  diagnosisPolicy: defaultDiagnosisPolicy,
  historyPolicy: defaultHistoryPolicy,
  cleanupPolicy: defaultCleanupPolicy,
  highRiskLimits: sampleHighRiskLimits,
  protectedLocations: sampleProtectedLocations,
  knownFolders: sampleKnownFolders,
};
