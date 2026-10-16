export const OwnerToolId = {
  DockerPrune: "docker-prune",
  HomebrewCleanup: "homebrew-cleanup",
  SimulatorCleanup: "simulator-cleanup",
  NpmCacheClean: "npm-cache-clean",
  PnpmStorePrune: "pnpm-store-prune",
  BunCacheClean: "bun-cache-clean",
} as const;
export type OwnerToolId = (typeof OwnerToolId)[keyof typeof OwnerToolId];
