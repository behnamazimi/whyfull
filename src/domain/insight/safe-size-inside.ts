import type { AbsolutePath } from "../path/absolute-path.ts";
import type { Classification } from "../rules/classification.ts";
import { SafetyLevel } from "../rules/safety-level.ts";
import { ByteSize } from "../size/byte-size.ts";

const SAFE_LEVELS: ReadonlySet<SafetyLevel> = new Set([
  SafetyLevel.Regenerable,
  SafetyLevel.SafeViaOwnerTool,
]);

/** How much of a folder is made of recognized items that are safe to clean. */
export const safeSizeInside = (
  classifications: readonly Classification[],
  folder: AbsolutePath,
): ByteSize =>
  ByteSize.sum(
    classifications
      .filter((item) => SAFE_LEVELS.has(item.rule.safety) && item.path.isInside(folder))
      .map((item) => item.size),
  );
