import type { AbsolutePath } from "../path/absolute-path.ts";
import type { ByteSize } from "../size/byte-size.ts";

export interface NotableFile {
  readonly path: AbsolutePath;
  readonly size: ByteSize;
  readonly lastModified: Date;
}
