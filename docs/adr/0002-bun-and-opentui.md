# 0002 — Bun runtime and OpenTUI renderer

**Status:** accepted

## Context

The hard part of whyfull is its knowledge base and UX, not raw directory walking, which is limited by system calls rather than by the language.

## Decision

- Bun + TypeScript. `bun build --compile` produces one binary per OS. `bun:sqlite` stores history.
- OpenTUI + React for the TUI, pinned to an exact version because it is pre-1.0. A spike confirmed that a compiled binary runs with OpenTUI's native library embedded.
- TypeScript is pinned to 6.x because typescript-eslint does not yet support 7.x.

## Consequences

- Binaries are around 80 MB.
- Components only render view-models, so the renderer can be replaced without touching logic.
- The scanner sits behind the `DiskScanner` port, so a native fast path (`getattrlistbulk` via `bun:ffi`) can replace it if benchmarks call for it.
