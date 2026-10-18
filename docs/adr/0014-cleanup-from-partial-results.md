# 0014 — Cleanup works from what the scan has measured, and revises results instead of rescanning

**Status:** accepted. Amends [0004](0004-safety-model.md) (nothing in the guards changes).

## Context

On a real home folder (75 GB, 828,000 files) a cold scan took about 4 minutes. The known
locations (caches, `node_modules`, Docker and so on) are measured completely within seconds and
already appear in the list, but the review stayed locked until the whole scan ended. After a
cleanup the app then scanned everything again, so the person waited twice to see what they had
just done.

## Decision

- **Review opens as soon as something is measured completely.** A running scan keeps a `preview`
  report: the finished known locations and top-level folders. `reviewCleanup` plans from the
  finished report, or from the preview while the scan runs. Only whole, measured folders are in a
  preview, and the guards still re-check each item's identity before and at the moment of acting.
- **Browsing folders, high-risk items and the AI prompt still wait for the finished scan.** They
  need the whole tree.
- **A cleanup does not trigger a scan.** The report's Enter and Esc return to the list. The
  finished report is revised: removed folders and files leave the tree (`reviseTree`), and folders
  an owner tool changed, or that were only partly deleted, are measured again
  (`DiagnoseDisk.refresh`). Findings and classification are recomputed from the revised tree.
- **A cleanup during a scan is remembered** (`pendingRevision`) and applied when the scan ends, so
  the final result never shows what was already removed.
- **History records only unrevised scans.** A scan that raced a cleanup is not saved as a
  snapshot.

## Consequences

- The first useful review comes in seconds, not minutes.
- A revised tree can differ slightly from a fresh scan (hard-link accounting); the next full scan
  corrects it.
- `DirectoryNode.locate` finds folders in a partial tree, where measured folders hang directly
  below the root.
