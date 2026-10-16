import type { AbsolutePath } from "../path/absolute-path.ts";
import type { OwnerToolId } from "../rules/owner-tool.ts";
import type { Rule } from "../rules/rule.ts";
import { ByteSize } from "../size/byte-size.ts";
import type { ItemIdentity } from "./item-identity.ts";

export const CartEntryKind = {
  Recognized: "recognized",
  HighRisk: "high-risk",
} as const;
export type CartEntryKind = (typeof CartEntryKind)[keyof typeof CartEntryKind];

export interface RecognizedEntry {
  readonly kind: typeof CartEntryKind.Recognized;
  readonly path: AbsolutePath;
  readonly rule: Rule;
  readonly size: ByteSize;
}

/** An item the person chose in high-risk mode. whyfull doesn't know what it is. */
export interface HighRiskEntry {
  readonly kind: typeof CartEntryKind.HighRisk;
  readonly path: AbsolutePath;
  readonly size: ByteSize;
  readonly fileCount: number;
  readonly personalFileCount: number;
  readonly lastModified: Date;
  readonly scannedIdentity: ItemIdentity | undefined;
  /** Set when a rule recognizes the item but only explains it. */
  readonly rule: Rule | undefined;
}

export type CartEntry = RecognizedEntry | HighRiskEntry;

export const CleanupActionKind = {
  Delete: "delete",
  MoveToTrash: "move-to-trash",
  RunOwnerTool: "run-owner-tool",
  DeleteHighRisk: "delete-high-risk",
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

export interface HighRiskAction {
  readonly kind: typeof CleanupActionKind.DeleteHighRisk;
  readonly path: AbsolutePath;
  readonly size: ByteSize;
  readonly fileCount: number;
  readonly scannedIdentity: ItemIdentity;
  readonly rule: Rule | undefined;
}

export type CleanupAction = PathAction | OwnerToolAction | HighRiskAction;

export const BlockReason = {
  ManualOnly: "manual-only",
  Protected: "protected",
  OutsideScanRoot: "outside-scan-root",
  ChangedSinceScan: "changed-since-scan",
  AppRunning: "app-running",
  ToolMissing: "tool-missing",
  OutsideHighRiskArea: "outside-high-risk-area",
  SyncedFolder: "synced-folder",
  PersonalLibrary: "personal-library",
  TheTrash: "the-trash",
  InsidePackage: "inside-package",
  InsideRecognizedItem: "inside-recognized-item",
  ContainsKeptItem: "contains-kept-item",
} as const;
export type BlockReason = (typeof BlockReason)[keyof typeof BlockReason];

export interface BlockedItem {
  readonly paths: readonly AbsolutePath[];
  readonly rule: Rule | undefined;
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

export type ApprovedAction = ApprovedPathAction | OwnerToolAction | HighRiskAction;

export interface CleanupPlan {
  readonly actions: readonly ApprovedAction[];
  readonly blocked: readonly BlockedItem[];
}

export const totalSizeOf = (items: readonly { readonly size: ByteSize }[]): ByteSize =>
  ByteSize.sum(items.map((item) => item.size));

export const pathsOf = (action: CleanupAction): readonly AbsolutePath[] =>
  action.kind === CleanupActionKind.RunOwnerTool ? action.paths : [action.path];

export const isHighRiskAction = (action: CleanupAction): action is HighRiskAction =>
  action.kind === CleanupActionKind.DeleteHighRisk;
