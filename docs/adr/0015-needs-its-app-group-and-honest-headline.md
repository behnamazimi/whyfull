# 0015 — Items that need their app's tool are a group of their own

**Status:** accepted. Amends [0009](0009-grouped-one-line-list.md) and [0012](0012-one-screen-frame-and-tabs.md).

## Context

The headline said "18 GB can be cleared safely". Review then showed 5.6 GB. The other 11 GB
was Docker's disk and the simulators, cleaned by their own tools, which free less than the
folder holds (see [0011](0011-delete-plain-caches-directly.md)). Another 1.6 GB was left out
because Notion and Xcode were open. The promise fell at every step.

## Decision

- **A new group, "Needs its app",** sits between Safe and Check first. It holds
  `SafetyLevel.SafeViaOwnerTool` items. It has its own chip, legend entry and total.
- **The headline counts only Safe.** The same line says "up to X more with app tools". `s` still
  selects only Safe, so the headline, the selection and the review agree.
- **An open app is said before the review.** The running apps are checked every few seconds.
  An item whose app is open says "Quit it first to include this" in its pane.
- **`r` checks a review again.** When items were left out because an app was open or a tool wasn't
  ready, the review offers "check again", which plans the same cleanup once more.
- **The review header splits what frees space now from what tools may free,** and merges
  duplicate "Left out" rows.
- **Filter chips drop their sizes before they would wrap.** A chip row is one line.

## Consequences

- The number at the top is a number the review can keep.
- Docker still appears first in its group, but no longer inflates the headline.
