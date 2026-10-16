// Decimal units, matching how Finder and Disk Utility report sizes.
const BYTES_PER_STEP = 1000;

export const DecimalUnit = {
  Byte: 1,
  Kilobyte: BYTES_PER_STEP,
  Megabyte: BYTES_PER_STEP * BYTES_PER_STEP,
  Gigabyte: BYTES_PER_STEP * BYTES_PER_STEP * BYTES_PER_STEP,
  Terabyte: BYTES_PER_STEP * BYTES_PER_STEP * BYTES_PER_STEP * BYTES_PER_STEP,
} as const;
export type DecimalUnit = (typeof DecimalUnit)[keyof typeof DecimalUnit];
