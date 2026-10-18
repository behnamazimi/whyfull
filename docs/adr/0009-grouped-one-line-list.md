# 0009 — The findings list is grouped by what a person can do, one line per item

**Status:** accepted. Amended by [0012](0012-one-screen-frame-and-tabs.md): rows carry no notes or tags, the bar is 10 cells, and chips show sizes instead of counts and leave out Yours. Amended by [0018](0018-summary-first-frame-and-folding-groups.md): groups fold instead of filtering, headers are cursor stops, rows carry a chip, and the bar is 8 cells.

## Context

The main list was one flat list sorted by size. Each item took two lines, and
the same fact appeared several ways: an icon, a colour and a word for safety,
and the same "not recognized" sentence on every unrecognized row. Safe, check
and unrecognized items were mixed together, so people had to read every row to
learn what kind it was. Nothing said what the whole list was worth.

The list screens had also drifted apart: different bar widths and colours, two
tag widths, and offsets kept in step by hand.

## Decision

- **Findings are ordered by group, then by size.** `diagnose()` sorts by
  `FindingGroup` (Safe, Check, Not recognized, Yours), so list order is display
  order and the cursor index is still the finding index.
- **Group headers name the group, say what to do, and show its total.** They
  can't be selected or clicked. Rows carry no safety icon or tag. Where rows
  aren't grouped (Folders, locations), a row keeps one short coloured word.
- **One line per row:** pointer, checkbox, size, bar, title and a muted note.
  Layout widths are derived from named parts in `Layout`, and the bar is 8
  cells everywhere.
- **A filter shows one group at a time.** `findingFilter` lives in the app
  state, not on the screen, and `findingsOf` returns the filtered list. Detail
  screens index into that same list. `tab` cycles the filter, and chips above
  the list show the counts.
- **The title carries the headline:** how much can be cleared safely.
- **The explanation stays in the detail pane** at 110 columns and wider, and
  behind `enter` in narrower windows.

## Alternatives considered

- **Keep one flat list and colour the rows.** Rejected: it keeps the reading
  work and the repeated signals.
- **Keep the filter on the Diagnosis screen.** Rejected: the detail screens
  hold an index into the findings, so they would need the filter too.
- **A new bottom detail pane.** Rejected: it doesn't fit the 80×18 minimum, and
  the side pane already exists.

## Consequences

- The exported diagnosis report is grouped the same way.
- A group's hint is dropped when the list is too narrow to show it.
- Cleanup review, Overview and Growth still draw their own rows. They share the
  bar width, but not yet the row anatomy.
