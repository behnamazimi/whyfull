# 0006 — Confirm a cleanup with `y`, not Enter

**Status:** accepted

## Decision

- The review screen starts a cleanup only on `y`. Enter does nothing there.
- The review screen groups the plan by kind of item and says, per group, whether the files are deleted for good, moved to the Trash, or cleaned by the owner's own tool.

## Why

Enter is also the key that opens an item on every other screen, so a held or repeated Enter could carry from the list into the review screen and start a cleanup the person has not read. A key that does nothing else makes confirming a deliberate act. Saying what happens to each group before confirming follows ADR 0004: the person should know whether a step can be undone.

## Consequences

Cleanup takes one deliberate key. The footer on the review screen shows `y clean up now`.
