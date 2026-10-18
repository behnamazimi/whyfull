# 0018 — One frame, four tabs, and a list grouped by what a person can do

**Status:** accepted. Replaces the earlier ADRs 0009, 0012, 0015 and 0017, which are removed (see git
history), and says what holds today.

## Context

The screens grew one at a time and read as ten different programs:

- The main screen mixed disk status, scan status, a summary, the list and the detail. Its footer
  listed eleven keys, and it advertised high-risk mode to the people least able to use it.
- The list was flat and sorted by size, and the same fact appeared several ways (an icon, a colour
  and a word for safety). A person had to read every row to learn what kind it was.
- The summary carried a legend of up to seven items next to a seven-colour bar. Its headline said
  how much could be cleared, not how full the disk was or what a cleanup would give back, and the
  number fell at every step: "18 GB can be cleared safely", then 5.6 GB in the review, because
  Docker's disk and the simulators are freed by their own tools and some apps were open.
- Folders, Disk, What grew and Help were pushed on a back stack, so nothing said where a person was.
  Each laid out its own rows, and the same total was called "selected", "picked" and "added".
- Rows had checkboxes that could only lead to a refusal.

## Decision

### The frame

- **One frame.** Every screen fills the same slots, in this order: tabs, a summary, a list with a
  detail pane, an action bar, and one row of keys. `appView` assembles it, and no screen adds chrome
  of its own.
- **Four tabs.** Cleanup, Folders, Disk and What grew switch with `1`-`4` (and `b`, `d`, `g`). A tab
  never stacks on another, so `esc` on a tab returns to Cleanup. Drilling into something inside a
  tab (a folder, one item's places) still pushes a screen, and `esc` comes back. The Cleanup tab
  shows how many items are selected, so picks made elsewhere stay in sight. A "•" on What grew says
  there is news, and only when the total grew by more than `growthMinimumSize`.
- **Dialogs** (review, More, the AI prompt, the permission guide, the cleanup report and the
  high-risk dialog) sit over the frame. While one is open, only the keys it shows do anything.
- **The window sets the density.** Roomy (32 rows or more) is 9 lines of frame, Snug (24 to 31) is
  8, and Compact (under 24) is 5. Below 24 rows the summary keeps only the heading and the bar;
  below 32 it drops the note. The smallest supported window (80×18) still shows at least five list
  rows once groups are open.
- **Fewer keys on screen.** The key row shows move, select, open, one screen-specific key, more and
  quit. Everything else is under More (`m` or `?`). `x` works everywhere.

### The summary

- **Three lines on every tab:** a heading with a fact at its right, a bar with a tail after it, and
  a note. There is no legend. The rows of the list are the bar's legend, and the part under the
  cursor is drawn in the cursor's colour.

| Tab       | Heading                                  | Bar                                       |
| --------- | ---------------------------------------- | ----------------------------------------- |
| Cleanup   | how full the disk is, and the free space | used, what the selection frees, free      |
| Folders   | where you are, as a breadcrumb           | the folder's children                     |
| Disk      | where the space goes                     | the disk's parts, each in its own texture |
| What grew | the change since the last scan           | the grown folders                         |

- **The Cleanup tail says what the selection gives back, honestly:** `→ 105 GB free` counts only what
  frees space now. What goes to the Trash, and what only an app's tool frees (an estimate), are said
  apart, because neither is certain. The number at the top is one the review can keep.
- **Colour means one thing.** Green, amber, grey and purple are the safety verdicts. Where there is
  no verdict (folders, disk, growth) bars use neutral tints, and Disk parts also differ by texture
  (`█ ▓ ▒ ░ ·`) so they read without colour. Blue is only the cursor.

### The list

- **Groups, in this order:** Safe to clear, Needs its app, Check first, Not recognized, Yours to
  keep. `diagnose()` sorts by group and then by size, so list order is display order, and the
  exported report is grouped the same way. A header names the group, says what to do, and shows its
  total; the hint is dropped when the list is narrow, and a folded group shows its item count.
- **Needs its app** holds `SafetyLevel.SafeViaOwnerTool` items: Docker's disk, the simulators. Its
  space is said as "up to X more with app tools", `s` selects only Safe, and the open app is named in
  the pane before the review. `r` in the review checks again when an app was open or a tool wasn't
  ready. The review header splits what frees space now, what goes to the Trash and what tools may
  free, and merges duplicate "Left out" rows.
- **Groups fold.** Not recognized and Yours to keep start folded, unless one group is all there is.
  A header is a stop for the cursor: `enter` folds or opens it, and `space` adds or removes what
  whyfull can clean in it. `navigationOf` is the one list of stops, and detail screens keep the
  finding's place in the scan's own list. A list that has just appeared puts the cursor on its first
  finding, not on a header.
- **One row, everywhere:** cursor, checkbox, icon, title, chip, size, an 8-cell bar and `›` for rows
  that open. Beside a pane the chip says in a few words what happens to the row (`→ Trash`,
  `via Docker`, `⚠ quit Notion`, `was 7.9 GB`, `18% of disk`).
- **The detail pane is 50 columns wide at 110 columns and more.** It holds what the row is, what
  happens if it goes, "Before you start" (an open app is marked as still to do, and what needs
  nothing as done), the place, and the actions. An owner tool is not claimed to be ready, because it
  is only checked at review ([0013](0013-probe-owner-tools-before-running.md)). Below 110 columns a
  three-line strip about the chosen row sits under the list instead.
- **No dead-end rows.** A row shows a checkbox only when selecting it can work. Rows high-risk mode
  must refuse have none: protected folders such as `Library`, synced folders, personal libraries,
  packages, and anything inside a recognized item. The pane says why in one sentence and offers
  "Look inside". `o` shows an item in Finder (`open -R`), so the person can free explain-only,
  blocked and unrecognized items themselves. Unrecognized rows show their place
  (`~/.claude/projects`, not `projects`). The Folders note and the Check group's hint no longer
  promise the Trash for everything.
- **Select all safe** (`s`) adds every item that comes back on its own. `S` (Shift+S) shares the
  summary once a cleanup has finished.

### The other tabs

- **Disk notes sit under the row they are about:** snapshots and unreadable folders with the space
  whyfull didn't look through, the running scan with the scanned folder.
- **What grew can select.** A grown folder whyfull recognizes and can clean can join the cleanup.
  With nothing to show, the pane says what the tab is for.

Nothing about what may be removed changes. The guards, the review step and the typed confirmation
are as in [0004](0004-safety-model.md), [0006](0006-confirm-cleanup-with-y.md) and
[0007](0007-high-risk-mode.md).

## Alternatives considered

- **Keep one flat list and colour the rows.** Rejected: it keeps the reading work and the repeated
  signals.
- **Filter chips, cycled with `tab`.** Tried, then dropped: a hidden key, and a list that showed one
  group at a time. Groups fold instead.
- **Fold with `tab` and keep headers out of the cursor order.** Rejected: a folded group could then
  never be reached by the cursor.
- **Keep the back stack and add a tab bar that only shows where you are.** Rejected: pressing `3`
  from Folders would push Disk on top, so the bar and `esc` would disagree.
- **Keep high-risk mode in the footer.** Rejected: it is rarely needed and the first thing a
  non-technical person would try.
- **Keep the legend.** Rejected: it repeats what the rows say and costs a line.
- **A new bottom detail pane.** Rejected: it doesn't fit the 80×18 minimum, and the side pane already
  exists.
- **Count the Trash in what a cleanup frees.** Rejected: the space only comes back once the Trash is
  emptied, and the report would then contradict the summary.

## Consequences

- Every list view builds its rows through one row shape and one title width, `rowTitleWidth`.
- Cart totals by effect come from one domain function, `outcomeOfCart`.
- Disk and What grew share the row anatomy with the Cleanup and Folders lists. The review draws its
  own rows, but shares the bar width.
