import type { OwnerToolId } from "./owner-tool.ts";

export const RemedyKind = {
  DeleteRegenerable: "delete-regenerable",
  MoveToTrash: "move-to-trash",
  RunOwnerTool: "run-owner-tool",
  ExplainOnly: "explain-only",
} as const;
export type RemedyKind = (typeof RemedyKind)[keyof typeof RemedyKind];

export type Remedy =
  | { readonly kind: typeof RemedyKind.DeleteRegenerable }
  | { readonly kind: typeof RemedyKind.MoveToTrash }
  | { readonly kind: typeof RemedyKind.RunOwnerTool; readonly tool: OwnerToolId }
  | { readonly kind: typeof RemedyKind.ExplainOnly };

export const deleteRegenerable = (): Remedy => ({ kind: RemedyKind.DeleteRegenerable });
export const moveToTrash = (): Remedy => ({ kind: RemedyKind.MoveToTrash });
export const runOwnerTool = (tool: OwnerToolId): Remedy => ({
  kind: RemedyKind.RunOwnerTool,
  tool,
});
export const explainOnly = (): Remedy => ({ kind: RemedyKind.ExplainOnly });
