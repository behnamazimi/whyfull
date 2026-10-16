import type { AbsolutePath } from "../path/absolute-path.ts";

export const ScanScopeKind = {
  Folder: "folder",
  WholeDisk: "whole-disk",
} as const;
export type ScanScopeKind = (typeof ScanScopeKind)[keyof typeof ScanScopeKind];

export interface ScanScope {
  readonly kind: ScanScopeKind;
  readonly root: AbsolutePath;
  readonly volumesOf: readonly AbsolutePath[];
  readonly excludedPaths: readonly AbsolutePath[];
}

export const folderScope = (root: AbsolutePath): ScanScope => ({
  kind: ScanScopeKind.Folder,
  root,
  volumesOf: [root],
  excludedPaths: [],
});
