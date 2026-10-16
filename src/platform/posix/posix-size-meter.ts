import { lstat } from "node:fs/promises";
import type { Clock, ScanEvent, SizeMeter } from "../../application/index.ts";
import { ByteSize, failure, success } from "../../domain/index.ts";
import { EventChannel } from "../../infrastructure/index.ts";
import { DirectoryWalk } from "./directory-walk.ts";
import { STAT_BLOCK_UNIT } from "./stat-block-unit.ts";

const NOTHING_IS_NOTABLE = ByteSize.fromBytes(Number.MAX_SAFE_INTEGER);

export const posixSizeMeter = (clock: Clock): SizeMeter => ({
  async allocatedSizeOf(path) {
    try {
      const stats = await lstat(path.toString());
      if (!stats.isDirectory())
        return success(ByteSize.fromAllocatedBlocks(stats.blocks, STAT_BLOCK_UNIT));
      const walk = new DirectoryWalk(
        {
          root: path,
          markerFileNames: new Set(),
          personalFileExtensions: new Set(),
          notableFileMinimumSize: NOTHING_IS_NOTABLE,
        },
        new EventChannel<ScanEvent>(),
        clock,
      );
      const snapshot = await walk.run();
      return success(snapshot.root.totalSize);
    } catch (error) {
      return failure({ reason: String(error) });
    }
  },
});
