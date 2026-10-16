import { z } from "zod";
import type {
  CommandLine,
  CommandRunner,
  StorageInspector,
  StorageUnavailable,
} from "../../application/index.ts";
import {
  ByteSize,
  failure,
  success,
  VolumeRole,
  type AbsolutePath,
  type Result,
  type StorageLayout,
} from "../../domain/index.ts";
import {
  DISK_COMMAND_TIMEOUT,
  LOCAL_SNAPSHOT_PREFIX,
  MacCommand,
  QUICK_COMMAND_TIMEOUT,
} from "./tools.ts";

const volumeInfoSchema = z.object({ APFSContainerReference: z.string() });

const apfsListSchema = z.object({
  Containers: z.array(
    z.object({
      ContainerReference: z.string(),
      CapacityCeiling: z.number().int().nonnegative(),
      CapacityFree: z.number().int().nonnegative(),
      Volumes: z.array(
        z.object({
          Name: z.string(),
          Roles: z.array(z.string()),
          CapacityInUse: z.number().int().nonnegative(),
        }),
      ),
    }),
  ),
});

const roleByApfsName: ReadonlyMap<string, VolumeRole> = new Map([
  ["System", VolumeRole.System],
  ["Data", VolumeRole.Data],
  ["Preboot", VolumeRole.Preboot],
  ["Recovery", VolumeRole.Recovery],
  ["Update", VolumeRole.Update],
  ["VM", VolumeRole.VirtualMemory],
]);

const MOUNT_POINT_COLUMN = /\d+%\s+(.+)$/;

const roleOf = (apfsRoles: readonly string[]): VolumeRole =>
  apfsRoles.map((role) => roleByApfsName.get(role)).find((role) => role !== undefined) ??
  VolumeRole.Other;

const unavailable = (reason: string): Result<never, StorageUnavailable> => failure({ reason });

export class MacOsStorageInspector implements StorageInspector {
  constructor(private readonly commands: CommandRunner) {}

  async describe(path: AbsolutePath): Promise<Result<StorageLayout, StorageUnavailable>> {
    const mountPoint = await this.mountPointOf(path);
    if (!mountPoint.ok) return mountPoint;
    const volume = await this.plist(MacCommand.volumeInfo(mountPoint.value), volumeInfoSchema);
    if (!volume.ok) return volume;
    const container = volume.value.APFSContainerReference;
    const listing = await this.plist(MacCommand.apfsContainer(container), apfsListSchema);
    if (!listing.ok) return listing;
    const details = listing.value.Containers.find((item) => item.ContainerReference === container);
    if (details === undefined) return unavailable(container);
    return success({
      capacity: ByteSize.fromBytes(details.CapacityCeiling),
      free: ByteSize.fromBytes(details.CapacityFree),
      volumes: details.Volumes.map((item) => ({
        name: item.Name,
        role: roleOf(item.Roles),
        used: ByteSize.fromBytes(item.CapacityInUse),
      })),
      localSnapshotCount: await this.localSnapshotCount(),
    });
  }

  private async mountPointOf(path: AbsolutePath): Promise<Result<string, StorageUnavailable>> {
    const output = await this.commands.run({
      ...MacCommand.mountPointOf(path.toString()),
      timeout: QUICK_COMMAND_TIMEOUT,
    });
    if (!output.ok) return unavailable(output.error.detail);
    const lines = output.value.standardOutput.trim().split("\n");
    const lastLine = lines[lines.length - 1] ?? "";
    const mountPoint = MOUNT_POINT_COLUMN.exec(lastLine)?.[1];
    return mountPoint === undefined ? unavailable(lastLine) : success(mountPoint);
  }

  private async plist<Schema extends z.ZodType>(
    command: Omit<CommandLine, "timeout">,
    schema: Schema,
  ): Promise<Result<z.infer<Schema>, StorageUnavailable>> {
    const plist = await this.commands.run({ ...command, timeout: DISK_COMMAND_TIMEOUT });
    if (!plist.ok) return unavailable(plist.error.detail);
    const json = await this.commands.run({
      ...MacCommand.plistToJson,
      timeout: QUICK_COMMAND_TIMEOUT,
      input: plist.value.standardOutput,
    });
    if (!json.ok) return unavailable(json.error.detail);
    const parsed = schema.safeParse(JSON.parse(json.value.standardOutput));
    return parsed.success ? success(parsed.data) : unavailable(parsed.error.message);
  }

  private async localSnapshotCount(): Promise<number> {
    const output = await this.commands.run({
      ...MacCommand.listLocalSnapshots,
      timeout: QUICK_COMMAND_TIMEOUT,
    });
    if (!output.ok) return 0;
    return output.value.standardOutput
      .split("\n")
      .filter((line) => line.trim().startsWith(LOCAL_SNAPSHOT_PREFIX)).length;
  }
}
