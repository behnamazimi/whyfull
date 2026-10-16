export const OwnerToolId = {
  DockerPrune: "docker-prune",
  SimulatorCleanup: "simulator-cleanup",
} as const;
export type OwnerToolId = (typeof OwnerToolId)[keyof typeof OwnerToolId];
