import { AbsolutePath, ScanScopeKind, type ScanScope } from "../../domain/index.ts";
import { PosixDiskScanner } from "../posix/posix-disk-scanner.ts";
import { statfsVolumeInfo } from "../posix/statfs-volume-info.ts";
import { PlatformId, type Platform, type PlatformEnvironment } from "../platform.ts";
import { sharedRulePack } from "../shared-rules/index.ts";
import { macOsPermissionAdvisor } from "./macos-permission-advisor.ts";
import { MacOsStorageInspector } from "./macos-storage-inspector.ts";
import { macOsSystemInfo } from "./macos-system-info.ts";
import { pasteboardClipboard } from "./pasteboard-clipboard.ts";
import { APP_DATA_DIRECTORY, ProtectedLocations, SystemLocation } from "./paths.ts";
import { macOsAppActivity, macOsOwnerTools, macOsTrashBin } from "./macos-cleanup.ts";
import { posixFileInspector, posixFileRemover } from "../posix/posix-file-system.ts";
import { macOsRulePack } from "./rules/index.ts";

function wholeDiskScope(): ScanScope | undefined {
  const root = AbsolutePath.parse(SystemLocation.root);
  const mountedVolumes = AbsolutePath.parse(SystemLocation.mountedVolumes);
  if (!root.ok || !mountedVolumes.ok) return undefined;
  return {
    kind: ScanScopeKind.WholeDisk,
    root: root.value,
    volumesOf: [root.value],
    excludedPaths: [mountedVolumes.value],
  };
}

export function createMacOsPlatform(environment: PlatformEnvironment): Platform {
  const pathContext = { home: environment.home };
  return {
    id: PlatformId.MacOs,
    pathContext,
    defaultScanRoot: environment.home,
    scanner: new PosixDiskScanner(environment.clock),
    volumes: statfsVolumeInfo,
    clipboard: pasteboardClipboard(environment.commands),
    systemInfo: macOsSystemInfo(environment.commands),
    storage: new MacOsStorageInspector(environment.commands),
    permissions: macOsPermissionAdvisor(pathContext, environment.commands),
    wholeDiskScope: wholeDiskScope(),
    files: posixFileInspector,
    remover: posixFileRemover,
    trash: macOsTrashBin(environment.commands),
    apps: macOsAppActivity(environment.commands),
    ownerTools: macOsOwnerTools(environment.commands),
    protectedLocations: ProtectedLocations.map((location) => location.resolve(pathContext)),
    dataDirectory: APP_DATA_DIRECTORY.resolve(pathContext),
    rulePacks: [sharedRulePack, macOsRulePack],
  };
}
