import type { AbsolutePath, Result } from "../../domain/index.ts";

export interface PathUnavailable {
  readonly reason: string;
}

export interface PathOpener {
  /** Shows the item in the system's file manager, selected inside its folder. */
  reveal(path: AbsolutePath): Promise<Result<void, PathUnavailable>>;
}
