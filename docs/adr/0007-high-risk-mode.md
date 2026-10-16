# 0007 — High-risk mode deletes items whyfull doesn't recognize

**Status:** accepted

## Context

whyfull cleans only items a rule recognizes. People often see a large folder or
file that whyfull can't explain, already know what it is, and want it gone.
Today they get "Only recognized items can be cleaned" and must leave whyfull to
free the space. This is the main gap between what whyfull shows and what it
lets people do.

## Decision

- **High-risk mode is off when whyfull starts.** It lives only in memory and is
  never saved, so each run starts safe.
- **It unlocks two kinds of item:** folders and files no rule recognizes, and
  recognized items whose rule only explains them (`explainOnly()`) and isn't
  `SafetyLevel.Protected`.
- **It works only inside the home folder, or on an external disk the person
  scanned.**
- **Some places stay blocked in every mode:**
  - Protected items, anything inside them, and the protected locations from
    ADR 0004.
  - Anything inside a cloud-synced folder (`~/Library/Mobile Documents`,
    `~/Library/CloudStorage`). Deleting there deletes the file on every synced
    device.
  - Anything inside the Photos library, Mail, Messages, Keychains, or
    `~/.ssh`.
  - The Trash folder itself. People empty it in Finder.
  - Anything inside a package, such as an `.app` or `.photoslibrary`. Removing
    part of a package breaks the whole package.
  - Anything inside a recognized item. whyfull points to that item instead.
  - The scan root and the home folder.
- **High-risk items are deleted for good, not moved to the Trash.** This is
  the one exception to ADR 0004's rule that only regenerable items are deleted
  directly.
- **Each item is checked again right before it's deleted.** Its device, inode,
  size, and symlink status must match what the scan saw. If anything changed,
  whyfull leaves it alone.
- **A partial deletion is reported as partial.** Deleting a folder removes
  files one at a time, so a locked or protected file can stop it partway. The
  report says what was removed and what's left.
- **The journal records the risk acceptance:** when the mode was turned on,
  and for each high-risk item its path, size, and file count, and that the
  person confirmed it.
- **whyfull never asks for an administrator password or uses `sudo`** to
  delete.

## How people turn it on and confirm

Most people who use whyfull aren't technical, so the mode is offered where
they need it, explained in plain words, and confirmed in a way that can't
happen by accident.

- **It's offered where people get stuck.** Pressing space on an item whyfull
  doesn't recognize says that whyfull can't tell if it's safe, and that `x`
  lets them delete it themselves in high-risk mode. The help screen lists `x`
  too. There's no settings menu or command-line flag.
- **`x` opens a confirmation dialog** over the current screen, framed in a
  warning color. It says what the mode lets them do, that deleted items skip
  the Trash so they need a backup, and what stays protected (synced folders,
  Photos, Mail, Messages, passwords, and the inside of apps).
- **Turning it on takes three deliberate steps.** The person ticks "I
  understand deleted items can't be put back" with space, moves to Turn on
  with an arrow key, and presses Enter. Cancel is selected when the dialog
  opens and again whenever the box is unticked, so Enter alone always cancels
  and a held key can't turn the mode on (see ADR 0006). `esc` closes the
  dialog. Every other key is ignored while it's open.
- **The item they were on is added right away** when they came from one, so
  they don't have to press space again.
- **While it's on, the header shows `⚠ High-risk mode`** in a warning color,
  with the symbol and words so it doesn't depend on color alone. High-risk
  items in the cleanup are tagged "⚠ Delete for good" when browsing, and
  "⚠ risk" in the narrower main list. The main screen's side pane shows when
  an unrecognized folder last changed and how many files it holds, plus a
  warning when it changed recently, holds photos, videos, or documents, or is
  app data in `~/Library`. Adding an item repeats those warnings in a notice.
  They come from metadata only.
- **`x` turns it off without asking.** Any high-risk items leave the cleanup,
  and a notice says how many.
- **Every blocked place says why in one sentence** and what to do instead, for
  example "Deleting it here deletes it on all your devices. Use Finder if
  you're sure."
- **The review screen lists high-risk items first, as their own group,** with
  "whyfull doesn't know what these are. This can't be undone." When this group
  exists, `y` doesn't start the cleanup. The person types `delete` and presses
  Enter. Letters show as they're typed, case doesn't matter, and Enter does
  nothing until the word is complete.
- **The report names high-risk items separately,** with their total size and
  any item that was only partly deleted.

## Alternatives considered

- **Move high-risk items to the Trash.** Rejected: the Trash frees no space
  until the person empties it, and the mode already makes the risk explicit.
- **Show the item in Finder and let the person delete it there.** Kept as a
  possible addition for blocked items, but it doesn't let whyfull free the
  space itself.
- **Remember a person's choice for a folder across runs.** Rejected: it turns
  one confirmation into standing permission.
- **Show the date of the last Time Machine backup** on the turn-on screen.
  Rejected for now: `tmutil latestbackup` fails when the backup disk isn't
  connected, so it would often show nothing or mislead.

## Consequences

- whyfull can now destroy personal data that the person chooses. The mode, the
  wording, and the typed confirmation are the only protection, so each needs
  tests.
- The scanner must record each item's device and inode, so the final check
  compares against the scan and not against the review.
- Cleanup outcomes gain a "partly deleted" result.
- The cart can hold items without a rule, so `CartEntry` becomes a union of
  recognized and high-risk entries.
