import { Duration } from "../shared/duration.ts";
import { ByteSize } from "../size/byte-size.ts";

const NOTABLE_FILE_MINIMUM_MEGABYTES = 50;
const LARGEST_FILES_SHOWN = 20;
const PROMPT_ENTRY_LIMIT = 15;
const MINIMUM_FINDING_MEGABYTES = 100;
const UNEXPLAINED_FOLDER_MINIMUM_GIGABYTES = 1;
const SHARE_EXPLAINED_BY_DEEPER_FOLDERS = 0.8;
const STALE_AFTER_DAYS = 180;
const HISTORY_FOLDER_MINIMUM_MEGABYTES = 100;
const GROWTH_MINIMUM_MEGABYTES = 200;
const SHARE_EXPLAINED_BY_DEEPER_GROWTH = 0.8;
const GROWN_FOLDERS_SHOWN = 5;
const SNAPSHOTS_KEPT_PER_FOLDER = 30;

export interface ScanPolicy {
  readonly notableFileMinimumSize: ByteSize;
  readonly largestFilesShown: number;
  readonly promptEntryLimit: number;
}

export interface DiagnosisPolicy {
  readonly minimumFindingSize: ByteSize;
  readonly unexplainedFolderMinimumSize: ByteSize;
  readonly shareExplainedByDeeperFolders: number;
  readonly staleAfter: Duration;
}

export interface HistoryPolicy {
  readonly folderMinimumSize: ByteSize;
  readonly growthMinimumSize: ByteSize;
  readonly shareExplainedByDeeperFolder: number;
  readonly grownFoldersShown: number;
  readonly snapshotsKept: number;
}

export const defaultHistoryPolicy: HistoryPolicy = {
  folderMinimumSize: ByteSize.fromMegabytes(HISTORY_FOLDER_MINIMUM_MEGABYTES),
  growthMinimumSize: ByteSize.fromMegabytes(GROWTH_MINIMUM_MEGABYTES),
  shareExplainedByDeeperFolder: SHARE_EXPLAINED_BY_DEEPER_GROWTH,
  grownFoldersShown: GROWN_FOLDERS_SHOWN,
  snapshotsKept: SNAPSHOTS_KEPT_PER_FOLDER,
};

export const defaultScanPolicy: ScanPolicy = {
  notableFileMinimumSize: ByteSize.fromMegabytes(NOTABLE_FILE_MINIMUM_MEGABYTES),
  largestFilesShown: LARGEST_FILES_SHOWN,
  promptEntryLimit: PROMPT_ENTRY_LIMIT,
};

export const defaultDiagnosisPolicy: DiagnosisPolicy = {
  minimumFindingSize: ByteSize.fromMegabytes(MINIMUM_FINDING_MEGABYTES),
  unexplainedFolderMinimumSize: ByteSize.fromGigabytes(UNEXPLAINED_FOLDER_MINIMUM_GIGABYTES),
  shareExplainedByDeeperFolders: SHARE_EXPLAINED_BY_DEEPER_FOLDERS,
  staleAfter: Duration.ofDays(STALE_AFTER_DAYS),
};
