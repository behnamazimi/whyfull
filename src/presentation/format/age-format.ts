import { Duration } from "../../domain/index.ts";

const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;
const YESTERDAY_DAYS = 1;

const plural = (count: number, unit: string): string =>
  `${String(count)} ${unit}${count === 1 ? "" : "s"} ago`;

export const wholeMonths = (duration: Duration): number =>
  Math.floor(duration.wholeDays / DAYS_PER_MONTH);

export function formatAge(date: Date, now: Date): string {
  const days = Duration.between(date, now).wholeDays;
  if (days === 0) return "today";
  if (days === YESTERDAY_DAYS) return "yesterday";
  if (days < DAYS_PER_MONTH) return plural(days, "day");
  if (days < DAYS_PER_YEAR) return plural(Math.floor(days / DAYS_PER_MONTH), "month");
  return plural(Math.floor(days / DAYS_PER_YEAR), "year");
}
