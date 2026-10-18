# 0018 — The summary leads with the disk, groups fold, and rows say what happens to them

**Status:** accepted. Amends [0012](0012-one-screen-frame-and-tabs.md) and
[0009](0009-grouped-one-line-list.md). Leaves [0017](0017-no-dead-end-rows.md) as it is.

## Context

The frame from 0012 was consistent, but hard to read at a glance:

- The summary carried a legend of up to seven items next to a seven-colour bar. The headline said
  how much could be cleared but not how full the disk was, and nothing said what a cleanup would
  give back.
- The main list was cut into groups by chips that `tab` cycled through. A person had to know the
  chips were there to find Not recognized, and the list never showed more than one group.
- The detail pane mixed facts, cautions and next steps into prose. An open app was one more
  sentence among the notes.
- The Disk pane repeated the same snapshot and permission notes on every row.
- Folders, Disk and What grew each phrased their summary differently.
- The action bar showed one combined total, though the Trash frees nothing until it is emptied.

## Decision

- **One summary, three lines.** A heading, a bar with a tail after it, and a note. There is no
  legend: the rows of the list are the bar's legend, and the part under the cursor is drawn in
  the cursor's colour. Cleanup says how full the disk is, and the tail says what the selection
  would give back: `→ 105 GB free`. It counts only what frees space now (deleted items). What goes
  to the Trash and what only an app's tool frees are said apart, because neither is certain. The
  disk's fullness is no longer repeated on every tab, only on Cleanup and Disk.
- **Disk parts are drawn in textures as well as tints** (`█ ▓ ▒ ░ ·`), and use the neutral tints, so
  they differ without colour and blue stays the cursor's.
- **Frame heights:** Roomy 9 lines, Snug 8, Compact 5. The thresholds do not change.
- **The Cleanup tab shows how many items are selected**, so picks made on other tabs stay in sight.
- **A row has a chip.** Beside a pane, each row says in a few words what happens to it
  (`→ Trash`, `via Docker`, `⚠ quit Notion`, `was 7.9 GB`, `18% of disk`). The bar is 8 cells, rows that
  open end in `›`, and the cursor is the `▌` block. The pane is 36 columns wide. Below 110 columns
  the chip goes, and the one-line caption becomes a three-line strip about the chosen row.
- **Groups fold.** The filter chips and `tab` are gone, and so is `findingFilter`. The state keeps
  `collapsedGroups`; Not recognized and Yours to keep start folded, unless one group is all there
  is. A group's header is a stop for the cursor: `enter` folds or opens it, and `space` adds or
  removes what whyfull can clean in it. `navigationOf` is the one list of stops, and detail screens
  keep the finding's place in the scan's own list. A list that has just appeared puts the cursor
  on its first finding, not on a header.
- **The pane lists what to do first.** "Before you start" marks an open app as still to do, and what
  needs nothing as done. An owner tool is not claimed to be ready, since it is only checked at
  review (0013).
- **Disk notes sit under the row they are about.** Snapshots and unreadable folders go with the
  space whyfull didn't look through, the running scan with the scanned folder.
- **What grew can select.** A grown folder whyfull recognizes and can clean can join the cleanup.
  With nothing to show, the pane says what the tab is for.
- **The review's header names the Trash amount** next to what frees space now.

Nothing about what may be removed changes. The guards, the review step and the typed confirmation
are as in [0004](0004-safety-model.md), [0006](0006-confirm-cleanup-with-y.md) and
[0007](0007-high-risk-mode.md).

## Alternatives considered

- **Keep the chips and only start on a quieter view.** Rejected: it keeps a hidden key and a list
  that shows one group at a time.
- **Fold with `tab` and keep headers out of the cursor order.** Rejected: a folded group could
  then never be reached by the cursor.
- **Keep the legend.** Rejected: it repeats what the rows already say and costs a line.
- **Count the Trash in what a cleanup frees.** Rejected: the space only comes back once the Trash is
  emptied, and the report would then contradict the summary.

## Consequences

- `CycleFilter` and its key are removed from the keymap, help and copy.
- Every list view builds its rows through one row shape and one title width, `rowTitleWidth`.
- Cart totals by effect come from one domain function, `outcomeOfCart`.
