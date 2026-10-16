import type { AbsolutePath, Result, StorageLayout } from "../../domain/index.ts";

export interface StorageUnavailable {
  readonly reason: string;
}

export interface StorageInspector {
  describe(path: AbsolutePath): Promise<Result<StorageLayout, StorageUnavailable>>;
}
