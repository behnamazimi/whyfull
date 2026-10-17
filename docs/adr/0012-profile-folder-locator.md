# 0012 — Rules for named subfolders inside profile folders

**Status:** accepted.

## Context

Chromium browsers keep one folder per profile (`Default`, `Profile 1`, `Profile 2`…).
Each profile holds rebuildable caches next to history, cookies, passwords and
extensions. Profile names are not known ahead of time, and a rule on the whole
browser folder would delete user data. Locators were literal paths, so a rule
could not say "the `Cache` folder inside any profile".

## Decision

- **A new locator, `InMatchingChildren`.** It names a parent folder, the child
  names that count as profiles (an exact name or a name prefix), and the
  subfolders inside each profile. Only those subfolders match.
- **Rules name subfolders, never a parent that holds user data.** This applies to
  Electron apps too: VS Code and Cursor list `Cache`, `CachedData` and similar
  folders, and never `User` or `Backups`.
- **These rules are not hotspots.** The matching profiles can't be listed before
  the scan, so the full scan finds them.
- **Data that can't be rebuilt is shown, not deleted.** Google Drive's offline
  data is `Protected`. Cursor chats, Telegram and the Claude app's large data
  file are `NeedsReview` with `explainOnly()`. WhatsApp and WeChat are
  `Protected`.
- **No two `atPath` rules may share a path.** Overlaps have no safety tie-break,
  so a test rejects them instead.

## Consequences

- Chrome, Edge and Brave profile caches are found for every profile.
- Closing the app first is required. The owner-app check matches the main
  process name, and helper processes only run while the main app runs.
- `Service Worker/CacheStorage` is included. Websites that work offline may
  need to download again, and the copy says so.
