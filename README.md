# whyfull

whyfull answers one question: "My disk is full, but why?" It looks through
your files, explains in plain language what is using your space, tells you
what is safe to remove, and helps you free space without risk.

whyfull runs in the Terminal on macOS. It only reads your files unless you
review and confirm a cleanup, and it never sends anything over the network.

## What you get

whyfull turns a full disk into a short, readable list instead of a folder
tree.

- **A plain-language diagnosis.** Each item says what it is, for example
  "Docker Desktop's virtual disk" or "iPhone and iPad backups", and how safe it
  is to remove.
- **An explanation for missing space.** The disk overview shows how much space
  sits in the scanned folder, elsewhere on the disk, in macOS itself, in
  virtual memory, and on other volumes.
- **A safe cleanup.** You choose items, review exactly what will happen, and
  confirm. Personal files go to the Trash, and app data is cleaned with the
  app's own tool.
- **What grew since last time.** Every scan is remembered, so the next one
  shows which folders grew.
- **Help for anything unknown.** For folders whyfull doesn't recognize, it
  copies a ready-made question you can paste into your AI assistant.

## Install

whyfull needs macOS 15 or later and [Bun](https://bun.sh) 1.4.3 or later to
build. To install it from source, follow these steps:

1.  Open the **Terminal** app.
2.  Go to the whyfull folder, then run the install script:

    ```bash
    ./scripts/install.sh
    ```

3.  If the script says so, add `~/.local/bin` to your `PATH`.

To install somewhere else, set `WHYFULL_INSTALL_DIR` before you run the
script.

## Use whyfull

whyfull starts with your home folder and shows the first results within a few
seconds. The list keeps improving while the scan runs.

```bash
whyfull
```

To look at a different folder, add its path:

```bash
whyfull ~/Documents
```

To look through the whole disk instead of one folder:

```bash
whyfull --whole-disk
```

### Keys

The bottom line of the screen always shows the keys you can use right now.
You can also click rows and scroll with the mouse.

| Key     | What it does                                         |
| ------- | ---------------------------------------------------- |
| `↑` `↓` | Move through the list                                |
| `enter` | Open the selected item                               |
| `esc`   | Go back                                              |
| `space` | Add the selected item to the cleanup, or remove it   |
| `c`     | Review the cleanup                                   |
| `a`     | Copy a question about the item for your AI assistant |
| `b`     | Browse folders yourself                              |
| `d`     | Show where all your disk space is                    |
| `w`     | Scan the whole disk                                  |
| `f`     | Let whyfull see protected folders                    |
| `g`     | Show what grew since your last scan                  |
| `?`     | Help                                                 |
| `q`     | Quit                                                 |

### Colors and labels

Each item has a label, and the color repeats what the label says.

- **Safe to remove** (green): The item is recreated when needed.
- **Safe with its own clean-up** (green): whyfull runs the tool that owns the
  item, for example `brew cleanup` or `docker system prune`.
- **Review first** (yellow): The item may matter to you. If you clean it, it
  goes to the Trash.
- **Keep** (red): whyfull never removes these. It explains how to manage them
  instead.
- **Unknown** (gray): whyfull doesn't recognize the folder yet. Press `a` to
  ask your AI assistant.

## Safety

whyfull is designed so that it can't cause harm by accident.

- Scanning only reads file information. It never opens your files.
- Nothing is removed until you review the cleanup and press `enter` to
  confirm.
- Before anything is changed, whyfull checks each item again. It skips
  anything that changed since the scan, anything outside the scanned folder,
  protected folders such as your home, **Documents**, and **Library**, and
  caches of apps that are still open.
- Personal files go to the Trash, so you can put them back.
- Every action is recorded in a journal in
  `~/Library/Application Support/whyfull`.
- After a cleanup, whyfull measures how much free space your disk actually
  gained.

<!-- prettier-ignore -->
> [!NOTE]
> Files in the Trash still use space. Empty the Trash in **Finder** when you're
> sure you don't need them.

## Privacy

whyfull has no network code. Nothing about your files leaves your Mac. The
"ask AI" feature shows you the text first and copies it to your clipboard only
when you confirm. Paths inside your home folder start with `~`, so your user
name isn't included.

## See protected folders

macOS protects some folders, such as **Mail** and **Messages**. To measure
them, give your terminal app Full Disk Access. whyfull can open the right
settings page for you. To grant access, follow these steps:

1.  In whyfull, press `f`, then press `enter`.
2.  In **System Settings**, turn on the switch for your terminal app, for
    example **Terminal** or **iTerm**.
3.  Quit and reopen the terminal, then run whyfull again.

## Reports for scripts

The `report` command prints a summary and exits, which is useful for scripts
and scheduled checks.

```bash
whyfull report ~/Library
```

To get the summary as JSON, add `--json`:

```bash
whyfull report --json
```

`report` also accepts `--whole-disk`.

## Development

This section is for people who want to change whyfull. The project uses Bun,
TypeScript, React, and [OpenTUI](https://github.com/anomalyco/opentui).

| Command             | What it does                                      |
| ------------------- | ------------------------------------------------- |
| `bun install`       | Install dependencies                              |
| `bun run dev`       | Run whyfull from source                           |
| `bun run check`     | Type-check, lint, check formatting, and run tests |
| `bun test`          | Run the tests                                     |
| `bun run build`     | Build binaries for Apple silicon and Intel Macs   |
| `bun run benchmark` | Compare scan speed and size with `du`             |

### Architecture

whyfull uses a ports-and-adapters design. Lint rules enforce the boundaries
between layers.

- `src/domain`: Pure logic, such as sizes, rules, classification, diagnosis,
  cleanup planning, and history.
- `src/application`: Use cases and the ports (interfaces) they need.
- `src/platform`: Operating-system adapters. macOS lives in
  `src/platform/macos`.
- `src/infrastructure`: SQLite, processes, and time.
- `src/presentation`: The TUI, view-models, and all user-facing text.
- `src/cli`: The entry point that connects everything.

The reasons behind these choices are recorded in [docs/adr](docs/adr).

### Add a rule

Rules describe known space users. To add one, follow these steps:

1.  Add an id to `RuleId` in `src/domain/rules/rule-id.ts`.
2.  Define the rule in a file under `src/platform/macos/rules` or
    `src/platform/shared-rules`. Put any path in the matching `paths.ts`.
3.  Add its plain-language text to `src/presentation/copy/rule-copy.ts`. The
    build fails until every rule has text.

### Add an operating system

To support another operating system, add a folder under `src/platform`
that implements the `Platform` interface, and register it in
`src/platform/registry.ts`. It must pass the shared contract tests in
`test/contracts`.
