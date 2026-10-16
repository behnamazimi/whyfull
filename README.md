# whyfull

whyfull explains why your Mac's disk is full and helps you free space safely.
It shows what is using your space in plain language, says what is safe to
remove, and only changes anything after you review and confirm. It never sends
anything over the network.

## Install

You need macOS 15 or later and [Bun](https://bun.sh) 1.4.3 or later. From this
folder, run:

```bash
./scripts/install.sh
```

## Use

Run `whyfull` to look through your home folder, or pass a folder path. Use
`--whole-disk` to look through the whole disk. The bottom line of the screen
always shows the keys you can use.

whyfull only cleans what it recognizes. For anything else, high-risk mode (`x`)
lets you delete folders and files in your home folder yourself. They're deleted
for good, so you confirm by typing `delete`.

```bash
whyfull
```

For a printed summary, use `whyfull report`, and add `--json` for JSON.

## Develop

Run `bun install`, then `bun run check` before every commit. Read
[AGENTS.md](AGENTS.md) for the architecture and code rules, and
[docs/adr](docs/adr) for the decisions behind them.
