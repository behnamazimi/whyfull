import type { AbsolutePath } from "../path/absolute-path.ts";
import type { Classification } from "../rules/classification.ts";
import type { Rule } from "../rules/rule.ts";
import type { ByteSize } from "../size/byte-size.ts";

export const FindingKind = {
  KnownItem: "known-item",
  UnexplainedFolder: "unexplained-folder",
} as const;
export type FindingKind = (typeof FindingKind)[keyof typeof FindingKind];

export interface KnownItemFinding {
  readonly kind: typeof FindingKind.KnownItem;
  readonly rule: Rule;
  readonly size: ByteSize;
  readonly staleSize: ByteSize;
  readonly locations: readonly Classification[];
  readonly lastModified: Date;
}

export interface UnexplainedFolderFinding {
  readonly kind: typeof FindingKind.UnexplainedFolder;
  readonly path: AbsolutePath;
  readonly size: ByteSize;
  readonly lastModified: Date;
}

export type Finding = KnownItemFinding | UnexplainedFolderFinding;
