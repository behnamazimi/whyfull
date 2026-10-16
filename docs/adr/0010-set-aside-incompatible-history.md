# 0010 — A database from another version is set aside, never reused or deleted

**Status:** accepted.

## Context

whyfull keeps scan history and the cleanup journal in one SQLite file. It
tracked the schema with `PRAGMA user_version` alone. That breaks when the file
was written by a different build: after a downgrade, or by another branch whose
migrations differ. The version number can match while the tables don't, so
migrations were skipped and later writes failed with errors like "no such
table". Pressing `x` crashed the key handler that way.

## Decision

- **After migrating, whyfull compares the file's tables and columns with a
  fresh database built from the same migrations.** A file also counts as
  unusable if its version is newer than any migration whyfull knows, if a
  migration fails, or if SQLite can't read it.
- **An unusable file is moved aside, not deleted.** It becomes
  `whyfull.db.other-version-<time>`, with its `-wal` and `-shm` files, and a new
  database starts. The journal records what was deleted, so it is never thrown
  away silently.
- **The person is told once.** The interactive view shows a notice, and
  `whyfull report` prints the new location to stderr.
- **Cleanup always has a working journal.** Running without one is not an
  option, because every action must be journaled before and after it runs.

## Alternatives considered

- **Refuse to start.** Safe, but it leaves people stuck with no way forward.
- **Run without history and journal.** Rejected: it breaks the rule that every
  action is journaled.
- **Delete the file.** Rejected: it destroys the audit trail.
- **Try to repair the file in place.** Rejected: whyfull can't know what another
  version meant by its columns.

## Consequences

- History from the other version isn't merged into the new file. The old file
  stays on disk for the person to inspect or delete.
- A downgrade then an upgrade sets the file aside both times.
- New migrations need nothing extra, because the expected schema is derived
  from the migration list.
