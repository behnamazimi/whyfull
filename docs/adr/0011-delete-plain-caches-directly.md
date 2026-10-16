# 0011 — Plain caches are deleted directly, not through their tool's cleaner

**Status:** accepted.

## Context

whyfull sized a cache by its whole folder, then asked the owning tool to clean
it. The tools clean less than the folder holds:

- `npm cache clean` empties only `~/.npm/_cacache`. On a real machine that was
  64 KB of a 2.5 GB folder; the rest was `_npx` (one-off commands), which npm
  never cleans.
- `pnpm store prune` removes only packages no registered project uses, so a
  store that projects still link to barely shrinks.
- `brew cleanup` also removes old versions from the Cellar, which is outside the
  folder whyfull measured, and has its own rules for what a download cache keeps.

The tool ran and reported success, yet the space shown never came back.

## Decision

- **npm, Bun, pnpm and Homebrew caches are `Regenerable` and deleted
  directly.** They hold only downloads that the tool fetches again. Nothing in
  them is personal data, and projects that already installed keep working.
- **A tool stays only when deleting by hand would destroy something.** Docker's
  virtual disk holds every image, container and volume in one file, and the
  iOS simulators folder is the simulators' own data and index. Both keep their
  owner tool.
- **Copy says what is honestly freed.** The pnpm store shares files with
  projects, so the copy says the gain can be smaller than shown. The simulator
  copy says only unavailable simulators are removed.

## Consequences

- The four owner tool ids and their commands are gone, with no tool needed on
  the machine for those caches.
- Every cleanup goes through the same delete guards and journal.
- Docker and the simulators can still free less than their size shows.
- Docker's disk is a sparse file. `docker system prune` frees space inside it,
  but macOS gets it back only when Docker trims the file, and prune removes
  nothing that a container still uses (11 of 11 images were in use on the
  machine checked). whyfull does not try to trim: it would need a privileged
  helper container from an image that may not exist. The copy says the file may
  stay large instead, and the measured gain reports what really came back.
