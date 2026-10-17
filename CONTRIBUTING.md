# Contributing to whyfull

Thanks for helping. The most useful contribution is teaching whyfull about one more space user.

## Run it

```bash
bun install
bun run dev -- ~/some/folder   # run from source
bun run check                  # types, lint, formatting, tests
```

Run `bun run check` before you open a pull request. It must pass.

## Add a space user (a rule)

1. Add an id to `src/domain/rules/rule-id.ts`.
2. Define the rule in `src/platform/macos/rules/` or `src/platform/shared-rules/`. Paths go in `paths.ts` next to it.
3. Add its plain-language text to `src/presentation/copy/rule-copy.ts`. The build fails without it.

**Only write facts you are sure of.** If you can't confirm what an app keeps in a folder, use `explainOnly()` and say so honestly in the text. A wrong "safe to remove" costs someone their data.

Write the text for someone who has never opened a terminal: what it is, what is lost if it goes, how to free the space.

## Share a report instead

No code needed. Run `whyfull report --json`, remove anything private, and open a ["Share your report"](https://github.com/behnamazimi/whyfull/issues/new?template=share-report.yml) issue. Folders that show up often get explained first.

## Ground rules

- Scanning only reads metadata. Nothing runs without the user confirming it.
- No network code, ever (see `docs/adr/0003-no-network.md`).
- Never test a real cleanup on your own files. Use temporary folders.
- The architecture and code rules are in [AGENTS.md](AGENTS.md). The same rules apply to people.
