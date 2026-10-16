import type { AbsolutePath } from "../path/absolute-path.ts";
import type { CleanupPolicy } from "../policy/policy.ts";
import { Duration } from "../shared/duration.ts";
import type { HighRiskLimits } from "./high-risk-limits.ts";

export const HighRiskWarning = {
  RecentlyChanged: "recently-changed",
  HasPersonalFiles: "has-personal-files",
  AppData: "app-data",
} as const;
export type HighRiskWarning = (typeof HighRiskWarning)[keyof typeof HighRiskWarning];

export interface HighRiskWarningSubject {
  readonly path: AbsolutePath;
  readonly lastModified: Date;
  readonly personalFileCount: number;
}

export function highRiskWarnings(
  subject: HighRiskWarningSubject,
  limits: HighRiskLimits,
  policy: CleanupPolicy,
  now: Date,
): readonly HighRiskWarning[] {
  const recentlyChanged = !Duration.between(subject.lastModified, now).isAtLeast(
    policy.recentlyChangedWithin,
  );
  return [
    ...(recentlyChanged ? [HighRiskWarning.RecentlyChanged] : []),
    ...(subject.personalFileCount > 0 ? [HighRiskWarning.HasPersonalFiles] : []),
    ...(subject.path.isInside(limits.appData) ? [HighRiskWarning.AppData] : []),
  ];
}
