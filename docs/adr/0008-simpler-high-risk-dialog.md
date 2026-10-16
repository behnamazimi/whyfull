# 0008 — Turning on high-risk mode takes one deliberate key

**Status:** accepted. Replaces the "Turning it on takes three deliberate steps"
part of ADR 0007. Everything else in ADR 0007 still holds.

## Context

ADR 0007 asked people to tick a box with space, move to Turn on with an arrow
key, and press Enter. In use this was the most confusing step in whyfull. The
focus markers were hard to see, the arrow keys only worked after the box was
ticked, and a wrong key gave a notice about ticking a box. People who clearly
wanted the mode gave up or pressed keys at random.

The box also repeated a check that already exists. Nothing is deleted when the
mode turns on. Every high-risk item still goes through the review screen, and
whyfull starts the cleanup only after the person types `delete`.

## Decision

- **`x` opens a short dialog.** It says what the mode does, that deleted items
  skip the Trash and can't be put back, what always stays protected, and that
  nothing is deleted yet.
- **Two keys act: `enter` turns the mode on, `esc` (or `x` again) cancels.**
  There is no checkbox, no buttons to move between, and no notice about
  ticking. Every other key is ignored while the dialog is open.
- **The typed `delete` on the review screen stays** and is the real
  confirmation. It is unchanged from ADR 0007.
- **The mode is still off at start, per run, and never saved.** It adds guards
  and removes none, as in ADR 0007.
- **The footer says what `x` does:** "high-risk mode" when
  the mode is off and "turn off high-risk mode" when it is on.

## Alternatives considered

- **Keep the checkbox and make Enter turn the mode on once ticked.** Fewer
  steps than before, but the box still repeats the typed confirmation and still
  needs an explanation of its own.
- **Turn the mode on without a dialog.** Rejected: people should read what
  stays protected and that the Trash is skipped before they see delete
  controls.

## Consequences

- One Enter now turns the mode on. This weakens the "a held key can't turn it
  on" property from ADR 0007, because Enter alone confirms. It is accepted
  because the dialog opens with `x`, not Enter, so a held Enter cannot open
  and confirm it, and because the review screen still needs the typed word.
- `DialogButton` and the `acknowledged` and `focus` fields are gone. Tests for
  ticking, switching buttons and the tick-first notice are removed.
