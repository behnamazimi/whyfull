import { ScanEventKind } from "../src/application/index.ts";
import { AbsolutePath, ByteSize, defaultScanPolicy } from "../src/domain/index.ts";
import { systemClock } from "../src/infrastructure/index.ts";
import { PosixDiskScanner } from "../src/platform/posix/posix-disk-scanner.ts";

const DU_KILOBYTE_BYTES = 1024;
const PERCENT = 100;
const MILLISECONDS_DECIMALS = 0;
const PERCENT_DECIMALS = 2;

const [, , target] = process.argv;
if (target === undefined) throw new Error("Usage: bun scripts/compare-with-du.ts <absolute path>");
const parsed = AbsolutePath.parse(target);
if (!parsed.ok) throw new Error(`Not an absolute path: ${target}`);

const scanStarted = performance.now();
let scannedBytes = 0;
let directories = 0;
for await (const event of new PosixDiskScanner(systemClock).scan({
  root: parsed.value,
  markerFileNames: new Set(),
  personalFileExtensions: new Set(),
  notableFileMinimumSize: defaultScanPolicy.notableFileMinimumSize,
})) {
  if (event.kind === ScanEventKind.Finished) {
    scannedBytes = event.snapshot.root.totalSize.bytes;
    directories = [...event.snapshot.root.walk()].length;
  }
}
const scanMilliseconds = performance.now() - scanStarted;

const duStarted = performance.now();
const du = Bun.spawnSync(["du", "-sk", "-x", target], { stderr: "ignore" });
const duMilliseconds = performance.now() - duStarted;
const duKilobytes = Number.parseInt(du.stdout.toString().split("\t")[0] ?? "", 10);
const duBytes = ByteSize.fromBytes(duKilobytes * DU_KILOBYTE_BYTES).bytes;

console.table({
  whyfull: {
    bytes: scannedBytes,
    milliseconds: scanMilliseconds.toFixed(MILLISECONDS_DECIMALS),
    directories,
  },
  du: {
    bytes: duBytes,
    milliseconds: duMilliseconds.toFixed(MILLISECONDS_DECIMALS),
    directories: "",
  },
});
console.log(
  `difference: ${(((scannedBytes - duBytes) / duBytes) * PERCENT).toFixed(PERCENT_DECIMALS)}%`,
);
