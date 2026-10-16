# 0003 — No network access

**Status:** accepted

## Decision

whyfull has no network port and imports no networking code. The "ask your AI assistant" feature builds a prompt, shows it to the user, and copies it to the clipboard only after they confirm.

## Consequences

"Nothing leaves your machine" is a property of the architecture, not a promise.
