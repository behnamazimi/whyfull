import { RemedyKind } from "../rules/remedy.ts";
import { ByteSize } from "../size/byte-size.ts";
import { CartEntryKind, type CartEntry } from "./cleanup-plan.ts";

/** What a cart would do once it runs, split by whether the space comes back right away. */
export interface CartOutcome {
  /** Deleted outright, so the space is free as soon as the cleanup ends. */
  readonly freesNow: ByteSize;
  /** Moved to the Trash, which frees nothing until the Trash is emptied. */
  readonly toTrash: ByteSize;
  /** Cleaned by an app's own tool. The tool decides how much comes back, so this is an upper bound. */
  readonly viaTools: ByteSize;
}

function bucketOf(entry: CartEntry): keyof CartOutcome | undefined {
  if (entry.kind === CartEntryKind.HighRisk) return "freesNow";
  switch (entry.rule.remedy.kind) {
    case RemedyKind.DeleteRegenerable:
    case RemedyKind.EmptyTrash:
      return "freesNow";
    case RemedyKind.MoveToTrash:
      return "toTrash";
    case RemedyKind.RunOwnerTool:
      return "viaTools";
    case RemedyKind.ExplainOnly:
      return undefined;
  }
}

export function outcomeOfCart(entries: Iterable<CartEntry>): CartOutcome {
  const sizes: Record<keyof CartOutcome, ByteSize[]> = { freesNow: [], toTrash: [], viaTools: [] };
  for (const entry of entries) {
    const bucket = bucketOf(entry);
    if (bucket !== undefined) sizes[bucket].push(entry.size);
  }
  return {
    freesNow: ByteSize.sum(sizes.freesNow),
    toTrash: ByteSize.sum(sizes.toTrash),
    viaTools: ByteSize.sum(sizes.viaTools),
  };
}
