# 0001 — Hexagonal architecture with lint-enforced layers

**Status:** accepted

## Context

whyfull ships for macOS first and must gain Linux support without a rewrite. The code must stay easy to read and change.

## Decision

Ports & adapters with six layers under `src/`:

| Layer            | May import                                                        |
| ---------------- | ----------------------------------------------------------------- |
| `domain`         | nothing outside itself                                            |
| `application`    | `domain`                                                          |
| `infrastructure` | `domain`, `application`, runtime modules, `zod`                   |
| `platform`       | `domain`, `application`, `infrastructure`, runtime modules, `zod` |
| `presentation`   | `domain`, `application`, React, OpenTUI                           |
| `cli`            | everything (composition root)                                     |

Cross-layer imports must go through the target layer's `index.ts`. `eslint-plugin-boundaries` enforces both rules, including third-party and Node/Bun modules.

## Consequences

- A new OS is a new `platform/<os>/` folder plus one registry entry, and it must pass the shared platform contract suite.
- Domain and application code are testable without a filesystem.
