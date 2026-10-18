# 0017 — A row shows a checkbox only when selecting it can work

**Status:** accepted. Amends [0009](0009-grouped-one-line-list.md).

## Decision

- **Rows high-risk mode must refuse have no checkbox,** in the main list and in Folders: protected
  folders such as `Library`, synced folders, personal libraries, packages, and anything inside a
  recognized item. The pane says why in one sentence and offers "Look inside".
- **The Folders note says what happens:** open a folder to look inside, and only recognized items
  can be cleaned. It no longer promises the Trash.
- **The "Check first" hint no longer promises the Trash for every item.**
- **`o` shows an item in Finder** (`open -R`). Explain-only items, blocked items and unrecognized
  folders offer it, so the person can free the space themselves.
- **Unrecognized rows show their place** (`~/.claude/projects`, not `projects`), shortened in the
  middle.
- **Apple's aerial wallpaper videos are `Regenerable`** and deleted directly, because macOS
  downloads them again.
