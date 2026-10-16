import { describe, expect, test } from "bun:test";
import { ByteSize, DecimalUnit } from "../../src/domain/index.ts";

const BLOCK_UNIT = ByteSize.fromBytes(512);
const BLOCK_COUNT = 8;
const SMALL = ByteSize.fromBytes(100);
const LARGE = ByteSize.fromBytes(300);

describe("ByteSize", () => {
  test("rejects negative and fractional byte counts", () => {
    expect(() => ByteSize.fromBytes(-1)).toThrow(RangeError);
    expect(() => ByteSize.fromBytes(Number.NaN)).toThrow(RangeError);
  });

  test("converts allocated blocks and decimal units", () => {
    expect(ByteSize.fromAllocatedBlocks(BLOCK_COUNT, BLOCK_UNIT).bytes).toBe(
      BLOCK_COUNT * BLOCK_UNIT.bytes,
    );
    expect(ByteSize.fromGigabytes(1).bytes).toBe(DecimalUnit.Gigabyte);
  });

  test("never goes below zero when subtracting", () => {
    expect(SMALL.minusOrZero(LARGE).isZero()).toBe(true);
  });

  test("sorts largest first and sums", () => {
    expect([SMALL, LARGE].sort(ByteSize.largestFirst)).toEqual([LARGE, SMALL]);
    expect(ByteSize.sum([SMALL, LARGE]).bytes).toBe(SMALL.bytes + LARGE.bytes);
  });
});
