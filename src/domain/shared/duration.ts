const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MILLISECONDS_PER_DAY =
  MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY;

export class Duration {
  static readonly zero: Duration = new Duration(0);

  private constructor(readonly milliseconds: number) {}

  static ofMilliseconds(milliseconds: number): Duration {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) {
      throw new RangeError(
        `Duration must be a non-negative finite number, got ${String(milliseconds)}`,
      );
    }
    return new Duration(milliseconds);
  }

  static ofSeconds(seconds: number): Duration {
    return Duration.ofMilliseconds(seconds * MILLISECONDS_PER_SECOND);
  }

  static ofDays(days: number): Duration {
    return Duration.ofMilliseconds(days * MILLISECONDS_PER_DAY);
  }

  static between(earlier: Date, later: Date): Duration {
    return Duration.ofMilliseconds(Math.max(0, later.getTime() - earlier.getTime()));
  }

  get wholeDays(): number {
    return Math.floor(this.milliseconds / MILLISECONDS_PER_DAY);
  }

  isAtLeast(other: Duration): boolean {
    return this.milliseconds >= other.milliseconds;
  }
}
