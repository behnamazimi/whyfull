import type { AbsolutePath } from "../path/absolute-path.ts";

/** Folders that hold many things, so no rule claims them, but whose purpose can still be explained. */
export const KnownFolderId = {
  Library: "library",
  ApplicationSupport: "application-support",
  Containers: "containers",
  GroupContainers: "group-containers",
  ICloudDrive: "icloud-drive",
  Downloads: "downloads",
  Desktop: "desktop",
  Documents: "documents",
  Movies: "movies",
  Music: "music",
  Pictures: "pictures",
} as const;
export type KnownFolderId = (typeof KnownFolderId)[keyof typeof KnownFolderId];

export interface KnownFolder {
  readonly id: KnownFolderId;
  readonly path: AbsolutePath;
}
