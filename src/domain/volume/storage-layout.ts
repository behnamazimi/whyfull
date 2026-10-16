import type { ByteSize } from "../size/byte-size.ts";

export const VolumeRole = {
  System: "system",
  Data: "data",
  Preboot: "preboot",
  Recovery: "recovery",
  Update: "update",
  VirtualMemory: "virtual-memory",
  Other: "other",
} as const;
export type VolumeRole = (typeof VolumeRole)[keyof typeof VolumeRole];

export interface VolumeSpace {
  readonly name: string;
  readonly role: VolumeRole;
  readonly used: ByteSize;
}

export interface StorageLayout {
  readonly capacity: ByteSize;
  readonly free: ByteSize;
  readonly volumes: readonly VolumeSpace[];
  readonly localSnapshotCount: number;
}
