export const OwnerToolId = {
  DockerPrune: "docker-prune",
  SimulatorCleanup: "simulator-cleanup",
} as const;
export type OwnerToolId = (typeof OwnerToolId)[keyof typeof OwnerToolId];

/** Why a tool can't be relied on, found by a check before it runs. */
export const ProbeProblem = {
  NotInstalled: "not-installed",
  Unusable: "unusable",
  NotRunning: "not-running",
  NotResponding: "not-responding",
  WrongEngine: "wrong-engine",
} as const;
export type ProbeProblem = (typeof ProbeProblem)[keyof typeof ProbeProblem];

/** Everything that can go wrong with a tool: a failed check, or a failure while it ran. */
export const ToolProblem = {
  ...ProbeProblem,
  TimedOut: "timed-out",
  Failed: "failed",
} as const;
export type ToolProblem = (typeof ToolProblem)[keyof typeof ToolProblem];

export type ToolReadiness =
  { readonly ready: true } | { readonly ready: false; readonly problem: ProbeProblem };

export const toolReady: ToolReadiness = { ready: true };
export const toolNotReady = (problem: ProbeProblem): ToolReadiness => ({ ready: false, problem });
