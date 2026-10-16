import type { Result } from "../../domain/index.ts";

export const AccessState = {
  Granted: "granted",
  Missing: "missing",
  Unknown: "unknown",
} as const;
export type AccessState = (typeof AccessState)[keyof typeof AccessState];

export interface SettingsUnavailable {
  readonly reason: string;
}

export interface PermissionAdvisor {
  fullDiskAccess(): Promise<AccessState>;
  openFullDiskAccessSettings(): Promise<Result<void, SettingsUnavailable>>;
}
