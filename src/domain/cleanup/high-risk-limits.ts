import type { AbsolutePath } from "../path/absolute-path.ts";

/** Where high-risk mode may delete, and what it never touches. See ADR 0007. */
export interface HighRiskLimits {
  readonly areas: readonly AbsolutePath[];
  readonly syncedFolders: readonly AbsolutePath[];
  readonly personalLibraries: readonly AbsolutePath[];
  readonly theTrash: AbsolutePath;
  readonly appData: AbsolutePath;
  readonly packageExtensions: ReadonlySet<string>;
}
