import type { Clock } from "../../application/index.ts";

export const systemClock: Clock = {
  now: () => new Date(),
};
