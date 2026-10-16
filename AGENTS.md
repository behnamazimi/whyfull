# AGENTS.md

whyfull is a macOS-first terminal tool, built with Bun, TypeScript, React, and
OpenTUI, that explains why a disk is full and frees space safely. Its users are
mostly non-technical people. Read this file before you change anything.

## Commands

Run `bun run check` before every commit. Commit only when it passes. Gate the
commit on the command's exit code, not on filtered output.

| Command             | Purpose                                           |
| ------------------- | ------------------------------------------------- |
| `bun run check`     | Type-check, lint, check formatting, and run tests |
| `bun run dev`       | Run from source (`bun run dev -- ~/some/folder`)  |
| `bun test`          | Run tests                                         |
| `bun run format`    | Format with Prettier                              |
| `bun run build`     | Build `dist/whyfull-darwin-arm64` and `-x64`      |
| `bun run benchmark` | Compare scan size and speed with `du`             |

## Architecture

The code follows ports and adapters. `eslint-plugin-boundaries` enforces these
rules, so a violation is a lint error.

| Layer                | May import                                                |
| -------------------- | --------------------------------------------------------- |
| `src/domain`         | Nothing outside itself. Pure logic, no I/O.               |
| `src/application`    | `domain`. Use cases and ports (interfaces).               |
| `src/infrastructure` | `domain`, `application`, `node:*`, `bun:*`, `zod`         |
| `src/platform`       | `domain`, `application`, `infrastructure`, runtime, `zod` |
| `src/presentation`   | `domain`, `application`, `react`, `@opentui/*`            |
| `src/cli`            | Everything. This is the composition root.                 |

- Cross-layer imports go through the target layer's `index.ts`. Deep imports
  are banned.
- Anything OS-specific belongs in `src/platform/<os>/`, behind the `Platform`
  interface in `src/platform/platform.ts`. Shared POSIX code lives in
  `src/platform/posix/`.
- A new OS is a new platform folder plus one entry in
  `src/platform/registry.ts`. It must pass `test/contracts/platform-contract.ts`.
- There is no network code, and none may be added (see
  `docs/adr/0003-no-network.md`).
- Record significant decisions as a new ADR in `docs/adr/`.

## Code rules

Code must explain itself. These rules are non-negotiable.

- **No type assertions.** `as` is banned, except `as const`. So are non-null
  `!`, `any`, and TypeScript `enum`.
- **Parse untrusted data.** Command output, database rows, JSON, and config
  start as `unknown` and are parsed with Zod.
- **No magic numbers or strings.** In `src`, every number other than 0 and 1 is
  a named constant. Closed sets are `as const` objects with a derived union
  type.
  - Paths live in `src/platform/<os>/paths.ts`.
  - External commands live in `src/platform/<os>/tools.ts`.
  - Thresholds live in `src/domain/policy/policy.ts`.
  - Key bindings live in `src/presentation/keymap.ts`.
  - Colors live in `src/presentation/theme.ts`.
- **All user-facing text lives in `src/presentation/copy/`.** Write it in plain
  language for non-technical readers.
- **Use exhaustive switches over unions.** List every case; don't use
  `default` to cover the rest. Use `assertNever` where a `default` is required.
  Prefer `Record<Union, …>` maps, so a missing entry is a compile error.
- **Expected failures return `Result`.** Exceptions mean bugs.
- **Comments only for a non-obvious "why",** usually a platform fact. Don't
  comment what the code already says.
- **Design for clarity.** One concept per file, named after its export. No
  `utils` or `helpers` modules. Use composition and constructor injection; no
  DI container.

## Safety rules for cleanup

Cleanup can destroy data, so these rules keep it safe. The full model is in
`docs/adr/0004-safety-model.md`.

- **Scanning only reads.** It reads metadata only, never file contents.
- **Sizes are allocated blocks.** Count hard links once. Never follow symlinks.
  Respect the scan scope's volumes and excluded paths.
- **Nothing runs without confirmation.** Cleanup goes cart → `draftCleanup` →
  `PlanCleanup` guards → user review → `ExecuteCleanup`.
- **Never weaken the guards.** They block protected locations, items outside
  the scan root, items whose identity changed (re-checked right before acting),
  open owner apps, and missing tools.
- **Choose the gentlest remedy.** Direct deletion is only for rules marked
  `SafetyLevel.Regenerable`. Personal data goes to the Trash. Owner tools
  (brew, docker, and so on) are preferred to deleting files by hand.
- **Journal every action** before and after it runs.
- **Never run a real cleanup on the developer's own files during development.**
  Test deletion only in temporary folders, and the Trash only with fakes.

## Rules (known space users)

Rules describe known space users. To add one:

1.  Add an id to `src/domain/rules/rule-id.ts`.
2.  Define the rule in `src/platform/macos/rules/` or
    `src/platform/shared-rules/`, with paths from `paths.ts`.
3.  Add its text to `src/presentation/copy/rule-copy.ts`. The build fails
    without it.

Only state facts about an app's files that you are confident of. If you're
unsure, use `explainOnly()` and say so honestly in the copy.

## Testing

- **Domain and use cases:** test with in-memory fakes from `test/support`.
- **Platform behavior:** test against real temporary fixture trees
  (`test/fixtures`).
- **TUI:** test the pure reducer and view-models. For end-to-end tests, use
  `testRender` from `@opentui/react/test-utils` and wrap interactions in
  `act`.
- **Magic numbers in tests:** the rule is relaxed under `test/`, but name your
  fixture values anyway.

## Gotchas

- **TypeScript is pinned to 6.x,** because typescript-eslint doesn't support 7
  yet.
- **OpenTUI is pre-1.0 and pinned to an exact version.** Components render only
  view-models, so the renderer stays replaceable.
- **Firmlinks share one device number.** On macOS, `/System/Volumes/Data`
  mirrors `/Users`, `/Applications`, and the other data folders with the same
  device number. Whole-disk scans exclude `/System/Volumes` to avoid counting
  everything twice.
- **x64 builds need extra packages.** Cross-building needs
  `bun install --cpu='*' --os=darwin`, which `bun run build` already runs.
