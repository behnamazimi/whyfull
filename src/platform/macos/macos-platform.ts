import { sharedRulePack } from "../shared-rules/index.ts";
import { PosixDiskScanner } from "../posix/posix-disk-scanner.ts";
import { statfsVolumeInfo } from "../posix/statfs-volume-info.ts";
import { PlatformId, type Platform, type PlatformEnvironment } from "../platform.ts";
import { macOsRulePack } from "./rules/index.ts";

export function createMacOsPlatform(environment: PlatformEnvironment): Platform {
  return {
    id: PlatformId.MacOs,
    pathContext: { home: environment.home },
    defaultScanRoot: environment.home,
    scanner: new PosixDiskScanner(environment.clock),
    volumes: statfsVolumeInfo,
    rulePacks: [sharedRulePack, macOsRulePack],
  };
}
