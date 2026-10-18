# 0016 — whyfull can empty the Trash

**Status:** accepted. Amends [0004](0004-safety-model.md) and [0007](0007-high-risk-mode.md).

## Context

Items the person checks are moved to the Trash, which frees no space until it is emptied. whyfull
told people so and sent them to Finder for the last step, so the main remedy for personal data
never gave space back inside the tool. [0007](0007-high-risk-mode.md) rejected "move high-risk
items to the Trash" for the same reason.

## Decision

- **Emptying the Trash is a cleanup action** (`CleanupActionKind.EmptyTrash`, remedy `emptyTrash`).
  It goes through draft, plan guards, review, execution and the journal like every other action,
  and the report measures what came back.
- **It asks Finder to do it** (`osascript`, "empty trash"). Finder handles locked items and needs
  no Full Disk Access. The first run may show macOS's "allow control of Finder" prompt.
- **The Trash is a finding in Check first** when the scan can read it.
- **After items were moved there, the report offers it:** "press y to empty the Trash now". That
  opens a review of one action; nothing runs until `y` is pressed there.
- **High-risk mode still doesn't touch the Trash folder itself.** Emptying is the Trash's own
  action, with its own review.

## Consequences

- "Move to the Trash" followed by "Empty the Trash" now frees space without leaving the tool.
- Two key presses (`y`, then `y` again in the review) are needed to empty the Trash; nothing
  deletes for good on one key.
