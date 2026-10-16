import { DecimalUnit } from "./units.ts";

export class ByteSize {
  static readonly zero: ByteSize = new ByteSize(0);

  private constructor(readonly bytes: number) {}

  static fromBytes(bytes: number): ByteSize {
    if (!Number.isSafeInteger(bytes) || bytes < 0) {
      throw new RangeError(`Byte count must be a non-negative integer, got ${String(bytes)}`);
    }
    return new ByteSize(bytes);
  }

  static fromMegabytes(megabytes: number): ByteSize {
    return ByteSize.fromBytes(Math.round(megabytes * DecimalUnit.Megabyte));
  }

  static fromGigabytes(gigabytes: number): ByteSize {
    return ByteSize.fromBytes(Math.round(gigabytes * DecimalUnit.Gigabyte));
  }

  static fromAllocatedBlocks(blockCount: number, blockUnit: ByteSize): ByteSize {
    return ByteSize.fromBytes(blockCount * blockUnit.bytes);
  }

  static sum(sizes: Iterable<ByteSize>): ByteSize {
    let total = 0;
    for (const size of sizes) total += size.bytes;
    return new ByteSize(total);
  }

  static readonly largestFirst = (left: ByteSize, right: ByteSize): number =>
    right.bytes - left.bytes;

  plus(other: ByteSize): ByteSize {
    return new ByteSize(this.bytes + other.bytes);
  }

  minusOrZero(other: ByteSize): ByteSize {
    return new ByteSize(Math.max(0, this.bytes - other.bytes));
  }

  isAtLeast(other: ByteSize): boolean {
    return this.bytes >= other.bytes;
  }

  isLargerThan(other: ByteSize): boolean {
    return this.bytes > other.bytes;
  }

  isZero(): boolean {
    return this.bytes === 0;
  }

  equals(other: ByteSize): boolean {
    return this.bytes === other.bytes;
  }

  shareOf(whole: ByteSize): number {
    return whole.isZero() ? 0 : this.bytes / whole.bytes;
  }
}
