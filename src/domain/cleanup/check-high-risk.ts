import type { AbsolutePath } from "../path/absolute-path.ts";
import type { Classification } from "../rules/classification.ts";
import type { Rule } from "../rules/rule.ts";
import { SafetyLevel } from "../rules/safety-level.ts";
import { BlockReason } from "./cleanup-plan.ts";
import type { HighRiskLimits } from "./high-risk-limits.ts";

export type HighRiskBlockReason =
  | typeof BlockReason.OutsideHighRiskArea
  | typeof BlockReason.SyncedFolder
  | typeof BlockReason.PersonalLibrary
  | typeof BlockReason.TheTrash
  | typeof BlockReason.Protected
  | typeof BlockReason.InsidePackage
  | typeof BlockReason.InsideRecognizedItem
  | typeof BlockReason.ContainsKeptItem;

export interface HighRiskBlock {
  readonly reason: HighRiskBlockReason;
  readonly rule: Rule | undefined;
}

export interface HighRiskCheckInput {
  readonly target: AbsolutePath;
  readonly limits: HighRiskLimits;
  readonly protectedLocations: readonly AbsolutePath[];
  readonly classifications: readonly Classification[];
}

const block = (reason: HighRiskBlockReason, rule?: Rule): HighRiskBlock => ({ reason, rule });

/**
 * Blocks the place itself and everything inside it. A target that only holds the place is blocked
 * too, but as `Protected`, because "this is in iCloud Drive" would be untrue of the folder around it.
 */
function guardedBy(
  target: AbsolutePath,
  places: readonly AbsolutePath[],
  reason: HighRiskBlockReason,
): HighRiskBlockReason | undefined {
  if (places.some((place) => target.isSameOrInside(place))) return reason;
  return places.some((place) => place.isInside(target)) ? BlockReason.Protected : undefined;
}

function isInsidePackage(
  target: AbsolutePath,
  area: AbsolutePath,
  limits: HighRiskLimits,
): boolean {
  for (let folder = target.parent; folder?.isInside(area) === true; folder = folder.parent) {
    const { extension } = folder;
    if (extension !== undefined && limits.packageExtensions.has(extension)) return true;
  }
  return false;
}

const deepestFirst = (left: Classification, right: Classification): number =>
  right.path.segments.length - left.path.segments.length;

/** Why high-risk mode must not delete this item, or undefined when it may. */
export function checkHighRisk(input: HighRiskCheckInput): HighRiskBlock | undefined {
  const { target, limits, protectedLocations, classifications } = input;
  const area = limits.areas.find((candidate) => target.isInside(candidate));
  if (area === undefined) return block(BlockReason.OutsideHighRiskArea);
  const guarded =
    guardedBy(target, limits.syncedFolders, BlockReason.SyncedFolder) ??
    guardedBy(target, limits.personalLibraries, BlockReason.PersonalLibrary) ??
    guardedBy(target, [limits.theTrash], BlockReason.TheTrash);
  if (guarded !== undefined) return block(guarded);
  if (protectedLocations.some((location) => location.isSameOrInside(target))) {
    return block(BlockReason.Protected);
  }
  if (isInsidePackage(target, area, limits)) return block(BlockReason.InsidePackage);
  const [enclosing] = classifications
    .filter((item) => target.isInside(item.path))
    .sort(deepestFirst);
  if (enclosing !== undefined) return block(BlockReason.InsideRecognizedItem, enclosing.rule);
  const kept = classifications.find(
    (item) => item.rule.safety === SafetyLevel.Protected && item.path.isSameOrInside(target),
  );
  if (kept !== undefined) return block(BlockReason.ContainsKeptItem, kept.rule);
  return undefined;
}
