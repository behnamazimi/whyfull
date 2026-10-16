import { statfs } from "node:fs/promises";
import type { VolumeInfoProvider, VolumeUnavailable } from "../../application/index.ts";
import {
  ByteSize,
  failure,
  success,
  type AbsolutePath,
  type Result,
  type VolumeUsage,
} from "../../domain/index.ts";

export const statfsVolumeInfo: VolumeInfoProvider = {
  async usageOf(path: AbsolutePath): Promise<Result<VolumeUsage, VolumeUnavailable>> {
    try {
      const stats = await statfs(path.toString());
      const blockSize = ByteSize.fromBytes(stats.bsize);
      const capacity = ByteSize.fromAllocatedBlocks(stats.blocks, blockSize);
      const free = ByteSize.fromAllocatedBlocks(stats.bfree, blockSize);
      return success({
        capacity,
        used: capacity.minusOrZero(free),
        available: ByteSize.fromAllocatedBlocks(stats.bavail, blockSize),
      });
    } catch {
      return failure({ path });
    }
  },
};
