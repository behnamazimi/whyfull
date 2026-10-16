import { describe, expect, test } from "bun:test";
import { breakDownUsage, ByteSize, UsageShareKind, VolumeRole } from "../../src/domain/index.ts";

const gigabytes = (amount: number): ByteSize => ByteSize.fromGigabytes(amount);

const layout = {
  capacity: gigabytes(500),
  free: gigabytes(15),
  localSnapshotCount: 2,
  volumes: [
    { name: "Macintosh HD", role: VolumeRole.System, used: gigabytes(12) },
    { name: "Preboot", role: VolumeRole.Preboot, used: gigabytes(9) },
    { name: "Data", role: VolumeRole.Data, used: gigabytes(436) },
    { name: "VM", role: VolumeRole.VirtualMemory, used: gigabytes(17) },
    { name: "Nix Store", role: VolumeRole.Other, used: gigabytes(3) },
  ],
};

describe("breakDownUsage", () => {
  test("splits used space into scanned, elsewhere, system, memory and other volumes", () => {
    const breakdown = breakDownUsage({
      layout,
      scannedSize: gigabytes(154),
      unreadableFolderCount: 3,
      scannedIncludesSystemVolume: false,
    });
    expect(breakdown.used).toEqual(gigabytes(485));
    expect(breakdown.shares.map((share) => [share.kind, share.size.bytes])).toEqual([
      [UsageShareKind.ScannedFolder, gigabytes(154).bytes],
      [UsageShareKind.ElsewhereOnDataVolume, gigabytes(282).bytes],
      [UsageShareKind.OperatingSystem, gigabytes(21).bytes],
      [UsageShareKind.VirtualMemory, gigabytes(17).bytes],
      [UsageShareKind.OtherVolumes, gigabytes(3).bytes],
    ]);
    expect(breakdown.shares.at(-1)?.volumeNames).toEqual(["Nix Store"]);
  });

  test("never reports more scanned space than the data volume holds", () => {
    const breakdown = breakDownUsage({
      layout,
      scannedSize: gigabytes(440),
      unreadableFolderCount: 0,
      scannedIncludesSystemVolume: false,
    });
    expect(breakdown.shares.map((share) => share.kind)).not.toContain(
      UsageShareKind.ElsewhereOnDataVolume,
    );
  });
});

describe("breakDownUsage for whole-disk scans", () => {
  test("does not count the system volume as data", () => {
    const breakdown = breakDownUsage({
      layout,
      scannedSize: gigabytes(448),
      unreadableFolderCount: 0,
      scannedIncludesSystemVolume: true,
    });
    expect(breakdown.shares[0]?.size).toEqual(gigabytes(436));
  });
});
