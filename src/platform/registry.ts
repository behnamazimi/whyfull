import { failure, success, type Result } from "../domain/index.ts";
import { createMacOsPlatform } from "./macos/macos-platform.ts";
import type { Platform, PlatformEnvironment, PlatformFactory } from "./platform.ts";

const OperatingSystem = {
  Darwin: "darwin",
} as const;

const platformFactories: ReadonlyMap<string, PlatformFactory> = new Map([
  [OperatingSystem.Darwin, createMacOsPlatform],
]);

export interface UnsupportedPlatform {
  readonly operatingSystem: string;
}

export function createPlatform(
  operatingSystem: string,
  environment: PlatformEnvironment,
): Result<Platform, UnsupportedPlatform> {
  const factory = platformFactories.get(operatingSystem);
  return factory === undefined ? failure({ operatingSystem }) : success(factory(environment));
}
