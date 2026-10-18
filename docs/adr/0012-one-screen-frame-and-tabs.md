# 0012 — Every screen fills one frame, and four tabs replace the back stack

**Status:** accepted. Amends [0009](0009-grouped-one-line-list.md) and
[0007](0007-high-risk-mode.md). Amended by
[0018](0018-summary-first-frame-and-folding-groups.md): the summary has no legend, groups fold
instead of filtering, the pane is 36 columns and the bar 8 cells.

## Context

The main screen mixed five jobs: disk status, scan status, the summary, the
list and the detail. Its footer listed eleven keys that wrapped onto a second
row, and it advertised high-risk mode to the people least able to use it.
Around it there were ten screens with three different chromes. The cart bar
showed on three of them, the Growth and Disk screens laid out their own rows,
and the same total was called "selected", "picked" and "added" in three places.
Folders, Disk, What grew and Help were all pushed on a back stack, so nothing
said where a person was.

## Decision

- **One frame.** Every screen fills the same slots, in this order: tabs, a
  summary (a headline number, one fact about the disk, a bar, a legend and one
  note), filter chips with a list and a detail pane, an action bar, and one row
  of keys. `appView` assembles it, and no screen adds chrome of its own.
- **Four tabs.** Cleanup, Folders, Disk and What grew switch with `1`-`4` (and
  the old `b`, `d`, `g`). A tab never stacks on another, so `esc` on a tab
  returns to Cleanup. Drilling into something inside a tab (a folder, one
  item's places) still pushes a screen with `esc` to come back.
- **Dialogs.** Review, More, the AI prompt, the permission guide, the cleanup
  report and the high-risk dialog sit over the frame. While one is open, only
  the keys it shows do anything.
- **One row, one pane.** All lists use the same row: pointer, checkbox, title,
  size and a 10 cell bar. Rows that can't be selected leave the checkbox
  empty. Facts that used to be notes or tags (category, places, age, safety)
  live in the detail pane. Below 110 columns the pane becomes a one-line
  caption under the list.
- **Colour means one thing.** Green, amber, grey and purple are the safety
  verdicts. Where there is no verdict (folders, disk, growth) bars use neutral
  tints. Blue is only the cursor.
- **One action, one place.** The action bar shows what is selected and holds
  the only button that starts a cleanup. Notices show there for a moment.
- **Fewer keys on screen.** The key row shows move, select, open, one key for
  the tab, more and quit. Everything else is under More (`m` or `?`), including
  high-risk mode under "Advanced". `x` still works everywhere.
- **Select all safe** (`s`) adds every item that comes back on its own. The
  summary now shares with `S` (Shift+S, once a cleanup has finished).
- **Protected items stay visible** as a locked group at the end of the Cleanup
  list. They have no checkbox, and are not a filter.
- **Growth moves out of Cleanup.** A "•" on the What grew tab says there is
  news, and only when the total grew by more than `growthMinimumSize`.
- **The window sets the density.** Below 24 rows the summary keeps only the
  headline and the bar; below 32 it drops the note. The smallest supported
  window (80x18) still shows at least five list rows.

Nothing about what may be removed changes. The guards, the review step and the
typed confirmation are as in [0004](0004-safety-model.md), [0006](0006-confirm-cleanup-with-y.md)
and 0007.

## Alternatives considered

- **Keep the back stack and add a tab bar that only shows where you are.**
  Rejected: pressing `3` from Folders would push Disk on top, so the bar and
  `esc` would disagree.
- **Keep high-risk mode in the footer.** Rejected: it is rarely needed and the
  first thing a non-technical person would try.
- **Make Yours a filter chip.** Rejected: it is a list of things there is
  nothing to do with, so it doesn't earn a chip.
