# 0004 — Safety model for cleanup

**Status:** accepted

## Decision

- Scanning is read-only. File contents are never read; only metadata is.
- Nothing is removed outside the cleanup cart: items are queued, planned, checked by safety guards, reviewed by the user, and only then executed.
- Each rule carries a remedy. The owning tool's command (for example `docker system prune`) is preferred over removing files directly.
- Personal data goes to the system Trash. Direct deletion is limited to items that pass every guard and are marked regenerable by a rule.
- Guards re-check every item right before acting: protected locations, inside the scan root, same device, inode and size as when scanned, owner app not running, owner tool available.
- A write-ahead journal records intent before each action and the outcome after it.
- Sizes are allocated blocks, not file lengths. Hard links count once. Symlinks are never followed and scans never cross devices.

## Consequences

Cleanup is slower to reach than in one-click cleaners, by design.
