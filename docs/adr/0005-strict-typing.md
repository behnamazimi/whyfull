# 0005 — Strict typing and no magic values

**Status:** accepted

## Decision

- The strictest practical `tsconfig` (see the file itself).
- Type assertions are banned; only `as const` is allowed. Untrusted data (command output, database rows, config) is `unknown` until a Zod schema parses it.
- Closed sets are `as const` objects with derived union types. TypeScript `enum` is banned.
- `@typescript-eslint/no-magic-numbers` allows only 0 and 1. Paths, commands, user-facing text and thresholds each live in a dedicated module.
- Expected failures return `Result` values; exceptions mean bugs.
- Comments only explain a non-obvious _why_, usually a platform fact.
