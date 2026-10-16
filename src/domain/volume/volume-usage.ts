import type { ByteSize } from "../size/byte-size.ts";

export interface VolumeUsage {
  readonly capacity: ByteSize;
  readonly used: ByteSize;
  readonly available: ByteSize;
}
