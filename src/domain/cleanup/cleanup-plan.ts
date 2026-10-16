import type { AbsolutePath } from "../path/absolute-path.ts";
import type { OwnerToolId } from "../rules/owner-tool.ts";
import type { Rule } from "../rules/rule.ts";
import { ByteSize } from "../size/byte-size.ts";
import type { ItemIdentity } from "./item-identity.ts";

export interface CartEntry {
  readonly path: AbsolutePath;
  readonly rule: Rule;
  readonly size: ByteSize;
}

export const CleanupActionKind = {
  Delete: "delete",
  MoveToTrash: "move-to-trash",
  RunOwnerTool: "run-owner-tool",
} as const;
export type CleanupActionKind = (typeof CleanupActionKind)[keyof typeof CleanupActionKind];

export interface PathAction {
  readonly kind: typeof CleanupActionKind.Delete | typeof CleanupActionKind.MoveToTrash;
  readonly path: AbsolutePath;
  readonly rule: Rule;
  readonly size: ByteSize;
}

export interface OwnerToolAction {
  readonly kind: typeof CleanupActionKind.RunOwnerTool;
  readonly tool: OwnerToolId;
  readonly paths: readonly AbsolutePath[];
  readonly rules: readonly [Rule, ...Rule[]];
  readonly size: ByteSize;
}

export type CleanupAction = PathAction | OwnerToolAction;

export const BlockReason = {
  ManualOnly: "manual-only",
  Protected: "protected",
  OutsideScanRoot: "outside-scan-root",
  ChangedSinceScan: "changed-since-scan",
  AppRunning: "app-running",
  ToolMissing: "tool-missing",
} as const;
export type BlockReason = (typeof BlockReason)[keyof typeof BlockReason];

export interface BlockedItem {
  readonly paths: readonly AbsolutePath[];
  readonly rule: Rule;
  readonly size: ByteSize;
  readonly reason: BlockReason;
  readonly detail: string | undefined;
}

export interface CleanupDraft {
  readonly actions: readonly CleanupAction[];
  readonly blocked: readonly BlockedItem[];
}

export interface ApprovedPathAction extends PathAction {
  readonly identity: ItemIdentity;
}

export type ApprovedAction = ApprovedPathAction | OwnerToolAction;

export interface CleanupPlan {
  readonly actions: readonly ApprovedAction[];
  readonly blocked: readonly BlockedItem[];
}

export const totalSizeOf = (items: readonly { readonly size: ByteSize }[]): ByteSize =>
  ByteSize.sum(items.map((item) => item.size));

export const pathsOf = (action: CleanupAction): readonly AbsolutePath[] =>
  action.kind === CleanupActionKind.RunOwnerTool ? action.paths : [action.path];
