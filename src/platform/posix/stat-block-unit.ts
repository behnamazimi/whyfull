import { ByteSize } from "../../domain/index.ts";

// st_blocks is counted in 512-byte units on macOS and Linux, whatever the filesystem block size.
const STAT_BLOCK_UNIT_BYTES = 512;

export const STAT_BLOCK_UNIT = ByteSize.fromBytes(STAT_BLOCK_UNIT_BYTES);
