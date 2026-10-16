import { DecimalUnit, type ByteSize } from "../../domain/index.ts";

const ONE_DECIMAL_BELOW = 10;
const ONE_DECIMAL = 1;
const NO_DECIMALS = 0;

const unitsLargestFirst = [
  { symbol: "TB", bytes: DecimalUnit.Terabyte },
  { symbol: "GB", bytes: DecimalUnit.Gigabyte },
  { symbol: "MB", bytes: DecimalUnit.Megabyte },
  { symbol: "KB", bytes: DecimalUnit.Kilobyte },
] as const;

export function formatByteSize(size: ByteSize): string {
  const unit = unitsLargestFirst.find((candidate) => size.bytes >= candidate.bytes);
  if (unit === undefined) return `${String(size.bytes)} bytes`;
  const value = size.bytes / unit.bytes;
  const decimals = value < ONE_DECIMAL_BELOW ? ONE_DECIMAL : NO_DECIMALS;
  return `${value.toFixed(decimals)} ${unit.symbol}`;
}
