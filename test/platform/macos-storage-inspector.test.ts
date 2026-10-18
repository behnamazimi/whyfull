import { describe, expect, test } from "bun:test";
import type { CommandLine, CommandRunner } from "../../src/application/index.ts";
import { ByteSize, success, VolumeRole } from "../../src/domain/index.ts";
import { MacOsStorageInspector } from "../../src/platform/macos/macos-storage-inspector.ts";
import { SystemTool } from "../../src/platform/macos/tools.ts";
import { pathOf } from "../support/domain-builders.ts";

const DF_OUTPUT = [
  "Filesystem   512-blocks      Used Available Capacity  Mounted on",
  "/dev/disk3s5  965595304 851698832  29812760    97%    /System/Volumes/Data",
].join("\n");

const VOLUME_INFO = JSON.stringify({ APFSContainerReference: "disk3" });

const APFS_LIST = JSON.stringify({
  Containers: [
    {
      ContainerReference: "disk3",
      CapacityCeiling: 500_000_000_000,
      CapacityFree: 15_000_000_000,
      Volumes: [
        { Name: "Macintosh HD", Roles: ["System"], CapacityInUse: 12_000_000_000 },
        { Name: "Data", Roles: ["Data"], CapacityInUse: 436_000_000_000 },
        { Name: "VM", Roles: ["VM"], CapacityInUse: 17_000_000_000 },
        { Name: "Nix Store", Roles: [], CapacityInUse: 3_000_000_000 },
      ],
    },
  ],
});

const SNAPSHOTS = [
  "Snapshots for disk /:",
  "com.apple.TimeMachine.2026-10-15-101010.local",
  "com.apple.TimeMachine.2026-10-16-101010.local",
].join("\n");

function scriptedRunner(): CommandRunner {
  const output = (standardOutput: string) =>
    Promise.resolve(success({ standardOutput, standardError: "" }));
  return {
    run(command: CommandLine) {
      const [first, second] = command.arguments;
      if (command.executable === SystemTool.df) return output(DF_OUTPUT);
      if (command.executable === SystemTool.tmutil) return output(SNAPSHOTS);
      if (command.executable === SystemTool.plutil) return output(command.input ?? "");
      return output(first === "info" ? VOLUME_INFO : second === "list" ? APFS_LIST : "");
    },
  };
}

describe("MacOsStorageInspector", () => {
  test("reads the APFS container that holds a folder", async () => {
    const layout = await new MacOsStorageInspector(scriptedRunner()).describe(pathOf("/Users/sam"));
    if (!layout.ok) throw new Error(layout.error.reason);
    expect(layout.value.capacity).toEqual(ByteSize.fromBytes(500_000_000_000));
    expect(layout.value.volumes.map((volume) => [volume.name, volume.role])).toEqual([
      ["Macintosh HD", VolumeRole.System],
      ["Data", VolumeRole.Data],
      ["VM", VolumeRole.VirtualMemory],
      ["Nix Store", VolumeRole.Other],
    ]);
    expect(layout.value.localSnapshotCount).toBe(2);
  });
});
