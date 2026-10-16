import type { ItemIdentity } from "../cleanup/item-identity.ts";
import type { AbsolutePath } from "../path/absolute-path.ts";
import type { ByteSize } from "../size/byte-size.ts";

export interface NotableFile {
  readonly path: AbsolutePath;
  readonly identity: ItemIdentity;
  readonly size: ByteSize;
  /** A photo, video or document, judged by file extension. */
  readonly isPersonal: boolean;
  readonly lastModified: Date;
}
