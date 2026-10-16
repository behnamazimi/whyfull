import { describe, expect, test } from "bun:test";
import { ByteSize } from "../../src/domain/index.ts";
import { formatAge } from "../../src/presentation/format/age-format.ts";
import { formatByteSize } from "../../src/presentation/format/byte-size-format.ts";
import { formatPath } from "../../src/presentation/format/path-format.ts";
import { pathOf, REFERENCE_DATE } from "../support/domain-builders.ts";

const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;
const daysBefore = (days: number): Date =>
  new Date(REFERENCE_DATE.getTime() - days * DAY_MILLISECONDS);

describe("formatting", () => {
  test("sizes use decimal units like Finder", () => {
    expect(formatByteSize(ByteSize.fromBytes(512))).toBe("512 bytes");
    expect(formatByteSize(ByteSize.fromMegabytes(540))).toBe("540 MB");
    expect(formatByteSize(ByteSize.fromGigabytes(1.24))).toBe("1.2 GB");
    expect(formatByteSize(ByteSize.fromGigabytes(118))).toBe("118 GB");
  });

  test("ages read naturally", () => {
    expect(formatAge(REFERENCE_DATE, REFERENCE_DATE)).toBe("today");
    expect(formatAge(daysBefore(1), REFERENCE_DATE)).toBe("yesterday");
    expect(formatAge(daysBefore(12), REFERENCE_DATE)).toBe("12 days ago");
    expect(formatAge(daysBefore(65), REFERENCE_DATE)).toBe("2 months ago");
    expect(formatAge(daysBefore(400), REFERENCE_DATE)).toBe("1 year ago");
  });

  test("paths inside the home folder start with ~", () => {
    const home = pathOf("/Users/sam");
    expect(formatPath(pathOf("/Users/sam/Library/Caches"), home)).toBe("~/Library/Caches");
    expect(formatPath(pathOf("/Applications"), home)).toBe("/Applications");
  });
});
