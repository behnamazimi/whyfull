import {
  AbsolutePath,
  defaultDiagnosisPolicy,
  defaultHistoryPolicy,
  defaultScanPolicy,
  folderScope,
  ScanScopeKind,
  type ScanScope,
} from "../../src/domain/index.ts";
import type { AppContext } from "../../src/presentation/tui/state/app-state.ts";
import { SAMPLE_HOME } from "./report-builder.ts";

export const sampleWholeDiskScope: ScanScope = {
  kind: ScanScopeKind.WholeDisk,
  root: AbsolutePath.root,
  volumesOf: [],
  excludedPaths: [],
};

export const sampleAppContext: AppContext = {
  home: SAMPLE_HOME,
  initialScope: folderScope(SAMPLE_HOME),
  wholeDiskScope: sampleWholeDiskScope,
  systemDescription: "macOS 26.0",
  scanPolicy: defaultScanPolicy,
  diagnosisPolicy: defaultDiagnosisPolicy,
  historyPolicy: defaultHistoryPolicy,
};
