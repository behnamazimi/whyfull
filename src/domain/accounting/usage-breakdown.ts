import { ByteSize } from "../size/byte-size.ts";
import { VolumeRole, type StorageLayout, type VolumeSpace } from "../volume/storage-layout.ts";

export const UsageShareKind = {
  ScannedFolder: "scanned-folder",
  ElsewhereOnDataVolume: "elsewhere-on-data-volume",
  OperatingSystem: "operating-system",
  VirtualMemory: "virtual-memory",
  OtherVolumes: "other-volumes",
} as const;
export type UsageShareKind = (typeof UsageShareKind)[keyof typeof UsageShareKind];

export interface UsageShare {
  readonly kind: UsageShareKind;
  readonly size: ByteSize;
  readonly volumeNames: readonly string[];
}

export interface UsageBreakdown {
  readonly capacity: ByteSize;
  readonly used: ByteSize;
  readonly free: ByteSize;
  readonly shares: readonly UsageShare[];
  readonly localSnapshotCount: number;
  readonly unreadableFolderCount: number;
}

export interface UsageBreakdownInput {
  readonly layout: StorageLayout;
  readonly scannedSize: ByteSize;
  readonly unreadableFolderCount: number;
  readonly scannedIncludesSystemVolume: boolean;
}

const OPERATING_SYSTEM_ROLES: ReadonlySet<VolumeRole> = new Set([
  VolumeRole.System,
  VolumeRole.Preboot,
  VolumeRole.Recovery,
  VolumeRole.Update,
]);

const share = (kind: UsageShareKind, volumes: readonly VolumeSpace[]): UsageShare => ({
  kind,
  size: ByteSize.sum(volumes.map((volume) => volume.used)),
  volumeNames: volumes.map((volume) => volume.name),
});

export function breakDownUsage(input: UsageBreakdownInput): UsageBreakdown {
  const { layout, scannedSize } = input;
  const withRole = (roles: ReadonlySet<VolumeRole>): VolumeSpace[] =>
    layout.volumes.filter((volume) => roles.has(volume.role));
  const dataVolumes = withRole(new Set([VolumeRole.Data]));
  const dataUsed = ByteSize.sum(dataVolumes.map((volume) => volume.used));
  const systemVolumeUsed = ByteSize.sum(
    withRole(new Set([VolumeRole.System])).map((volume) => volume.used),
  );
  const scannedDataOnly = input.scannedIncludesSystemVolume
    ? scannedSize.minusOrZero(systemVolumeUsed)
    : scannedSize;
  const scannedOnData = dataUsed.isZero()
    ? scannedDataOnly
    : ByteSize.fromBytes(Math.min(scannedDataOnly.bytes, dataUsed.bytes));

  const shares: UsageShare[] = [
    { kind: UsageShareKind.ScannedFolder, size: scannedOnData, volumeNames: [] },
    {
      kind: UsageShareKind.ElsewhereOnDataVolume,
      size: dataUsed.minusOrZero(scannedOnData),
      volumeNames: dataVolumes.map((volume) => volume.name),
    },
    share(UsageShareKind.OperatingSystem, withRole(OPERATING_SYSTEM_ROLES)),
    share(UsageShareKind.VirtualMemory, withRole(new Set([VolumeRole.VirtualMemory]))),
    share(UsageShareKind.OtherVolumes, withRole(new Set([VolumeRole.Other]))),
  ];

  return {
    capacity: layout.capacity,
    used: layout.capacity.minusOrZero(layout.free),
    free: layout.free,
    shares: shares.filter((item) => !item.size.isZero()),
    localSnapshotCount: layout.localSnapshotCount,
    unreadableFolderCount: input.unreadableFolderCount,
  };
}
