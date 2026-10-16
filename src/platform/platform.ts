import type {
  Clipboard,
  Clock,
  CommandRunner,
  DiskScanner,
  PermissionAdvisor,
  StorageInspector,
  SystemInfo,
  VolumeInfoProvider,
} from "../application/index.ts";
import type { AbsolutePath, PathContext, RulePack, ScanScope } from "../domain/index.ts";

export const PlatformId = {
  MacOs: "macos",
} as const;
export type PlatformId = (typeof PlatformId)[keyof typeof PlatformId];

export interface PlatformEnvironment {
  readonly home: AbsolutePath;
  readonly clock: Clock;
  readonly commands: CommandRunner;
}

export interface Platform {
  readonly id: PlatformId;
  readonly pathContext: PathContext;
  readonly defaultScanRoot: AbsolutePath;
  readonly scanner: DiskScanner;
  readonly volumes: VolumeInfoProvider;
  readonly clipboard: Clipboard;
  readonly systemInfo: SystemInfo;
  readonly storage: StorageInspector;
  readonly permissions: PermissionAdvisor;
  readonly wholeDiskScope: ScanScope | undefined;
  readonly rulePacks: readonly RulePack[];
}

export type PlatformFactory = (environment: PlatformEnvironment) => Platform;
