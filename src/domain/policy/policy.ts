import { Duration } from "../shared/duration.ts";
import { ByteSize } from "../size/byte-size.ts";

const NOTABLE_FILE_MINIMUM_MEGABYTES = 50;
const LARGEST_FILES_SHOWN = 20;
const MINIMUM_FINDING_MEGABYTES = 100;
const UNEXPLAINED_FOLDER_MINIMUM_GIGABYTES = 1;
const SHARE_EXPLAINED_BY_DEEPER_FOLDERS = 0.8;
const STALE_AFTER_DAYS = 180;

export interface ScanPolicy {
  readonly notableFileMinimumSize: ByteSize;
  readonly largestFilesShown: number;
}

export interface DiagnosisPolicy {
  readonly minimumFindingSize: ByteSize;
  readonly unexplainedFolderMinimumSize: ByteSize;
  readonly shareExplainedByDeeperFolders: number;
  readonly staleAfter: Duration;
}

export const defaultScanPolicy: ScanPolicy = {
  notableFileMinimumSize: ByteSize.fromMegabytes(NOTABLE_FILE_MINIMUM_MEGABYTES),
  largestFilesShown: LARGEST_FILES_SHOWN,
};

export const defaultDiagnosisPolicy: DiagnosisPolicy = {
  minimumFindingSize: ByteSize.fromMegabytes(MINIMUM_FINDING_MEGABYTES),
  unexplainedFolderMinimumSize: ByteSize.fromGigabytes(UNEXPLAINED_FOLDER_MINIMUM_GIGABYTES),
  shareExplainedByDeeperFolders: SHARE_EXPLAINED_BY_DEEPER_FOLDERS,
  staleAfter: Duration.ofDays(STALE_AFTER_DAYS),
};
