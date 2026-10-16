import type { Classification } from "../rules/classification.ts";
import { Duration } from "../shared/duration.ts";

export const isStale = (item: Classification, now: Date, staleAfter: Duration): boolean =>
  Duration.between(item.lastModified, now).isAtLeast(staleAfter);
