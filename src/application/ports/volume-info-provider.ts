import type { AbsolutePath, Result, VolumeUsage } from "../../domain/index.ts";

export interface VolumeUnavailable {
  readonly path: AbsolutePath;
}

export interface VolumeInfoProvider {
  usageOf(path: AbsolutePath): Promise<Result<VolumeUsage, VolumeUnavailable>>;
}
