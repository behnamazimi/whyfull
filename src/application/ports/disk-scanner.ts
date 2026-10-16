import type { AbsolutePath, ByteSize, DirectoryNode, ScanSnapshot } from "../../domain/index.ts";

export interface ScanRequest {
  readonly root: AbsolutePath;
  readonly volumesOf?: readonly AbsolutePath[];
  readonly excludedPaths?: readonly AbsolutePath[];
  readonly markerFileNames: ReadonlySet<string>;
  readonly notableFileMinimumSize: ByteSize;
  readonly alreadyScanned?: ReadonlyMap<string, DirectoryNode>;
  readonly signal?: AbortSignal;
}

export const ScanEventKind = {
  Progress: "progress",
  TopLevelFolderCompleted: "top-level-folder-completed",
  Finished: "finished",
  Failed: "failed",
} as const;
export type ScanEventKind = (typeof ScanEventKind)[keyof typeof ScanEventKind];

export interface ScanProgress {
  readonly directoriesScanned: number;
  readonly sizeFound: ByteSize;
  readonly currentPath: AbsolutePath;
}

export type ScanEvent =
  | ({ readonly kind: typeof ScanEventKind.Progress } & ScanProgress)
  | { readonly kind: typeof ScanEventKind.TopLevelFolderCompleted; readonly folder: DirectoryNode }
  | { readonly kind: typeof ScanEventKind.Finished; readonly snapshot: ScanSnapshot }
  | { readonly kind: typeof ScanEventKind.Failed; readonly reason: string };

export interface DiskScanner {
  scan(request: ScanRequest): AsyncIterable<ScanEvent>;
}
