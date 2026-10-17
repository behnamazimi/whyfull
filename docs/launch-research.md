# Launch research and audits

Written 2026-10-17. Evidence labels: **[repo]** read in this repository, **[web]**
found by web search (secondhand), **[inference]** my reading, to be tested.

## Limits of the evidence

Reddit, Hacker News, X and their APIs were blocked in the research sandbox. Web
findings come from search results and GitHub pages, not the original threads. No
Reddit upvote counts were obtained. The app could not be run (it is macOS-only
and the sandbox was Linux), so the audits come from code, README and screenshot.

## 1. How comparable tools launched

| Case                                                                                                                                 | What happened                                                                                                                                                                                         | Takeaway                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [Mole](https://github.com/tw93/Mole) (macOS CLI cleaner)                                                                             | X launch post 2025-09-30 "Dig deep like a mole to clean your Mac". Pitch: replaces CleanMyMac, AppCleaner, DaisyDisk, iStat. 23k stars by 2025-12-31, 36k by 2026-02-22 (post: 104k views), ~70k now. | Name the paid apps replaced. Author already had an audience (13.4k GitHub followers). |
| Mole endorsements                                                                                                                    | A developer with an audience posted "open source and gratis!" (2025-12-24). YouTube tutorial. TidBITS thread praising dry-run. An AlternativeTo commenter suspected fake stars.                       | Third-party voices build trust. Trust is contested in this category.                  |
| Mole's author on growth [web]                                                                                                        | No marketing, word of mouth. X spikes and fades, YouTube decays slowly. Later shipped a paid native app; buyers were long-time CLI users first.                                                       | CLI first, GUI later is a proven path.                                                |
| [Radix](https://github.com/colinvkim/Radix) (GUI, 962 stars)                                                                         | r/macapps post "Native macOS Disk Space Analyzer (Free DaisyDisk Alternative)". Follow-up post on memory use. Digital Trends covered it, June 2026.                                                   | Title = category + "Free X alternative". Mainstream press covered the GUI app.        |
| [Leaves](https://news.ycombinator.com/item?id=48936389) Show HN                                                                      | 72 points. Framed as a gap (servers, `ncdu` shows one directory), a real finding, honest limits. Commenters asked for a Mac install.                                                                  | Gap + real result + limits.                                                           |
| [syz](https://news.ycombinator.com/item?id=47662312), [Dut](https://news.ycombinator.com/item?id=40932492)                           | syz drew feature-creep pushback. Dut led with speed claims against dua and dust.                                                                                                                      | HN judges disk tools on speed and minimalism.                                         |
| [Zero-audience CLI](https://dev.to/krit83/i-launched-an-open-source-cli-tool-with-zero-audience-heres-what-happened-in-10-days-1d6g) | Show HN 2 points. r/python post caught by spam filter for days.                                                                                                                                       | Baseline without an audience.                                                         |

Channel data: a [preprint on 138 AI-tool launches](https://arxiv.org/abs/2511.04453)
found +121 stars in 24 hours and +289 in a week after HN exposure, no measurable
"Show HN" tag benefit, and timing mattering. AI tools only, single author.

Gates and listings [web]:

- r/macapps main feed wants 100+ stars and a year of GitHub history, otherwise the
  "App Pile" megathread (name, problem, 1-2 competitor comparison, price, link).
  Read from mirrors; check the live rules.
- [Homebrew core](https://docs.brew.sh/Acceptable-Formulae): 75 stars / 30 forks /
  30 watchers, or 225 / 90 / 90 for a self-submission; repo at least 30 days old.
- [Terminal Trove](https://terminaltrove.com/submit/): needs a PNG/GIF/MP4 preview
  and install steps per package manager.
- The category is crowded with "CleanMyMac alternative" projects (PureMac,
  ClearDisk, mac-cleaner-cli and others).

## 2. Audit one: why care, and organic reach

What works [repo]: the headline "22 GB can be cleared safely"; per-item "What it
is / If removed / Cleaning up"; Safe / Check / Not recognized tiers; `a` copies an
AI-assistant prompt for unknown folders; checksums and provenance attestation.

Problems [repo]:

1. **No LICENSE file.** Nobody has a right to use or copy the code. Fix first.
2. **Mostly developer rules.** 40 of 67 rule ids are developer-file or container
   rules (by category), plus 4 AI-model rules.
3. **"Not recognized" is the biggest bucket in the screenshot** (41 GB, top item
   `Library` 35 GB, unexplained).
4. macOS only, macOS 15 or later.

Reach gaps [repo]: no demo GIF (PNG only), no shareable result, no contribution
guide for people (AGENTS.md is for agents), no search-facing content, all commits
dated 2026-10-16 (age gates above are running), speed claim unpublished though
`bun run benchmark` exists.

## 3. Audit two: making it work for people who are not developers

### What already helps [repo]

- Copy is plain language, with a Full Disk Access walkthrough inside the app.
- Mouse works (`useMouse: true`), so non-keyboard users can click.
- Personal data goes to the Trash. Photos, Messages and Mail are explained, not
  deleted. iCloud Drive and synced folders are blocked.
- The disk overview explains macOS, memory files and Time Machine snapshots.

### Gaps

| #   | Gap                                                                                 | Evidence                                                                                                                                                                                         | Why it blocks non-developers                                                              |
| --- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 1   | **Install needs a terminal and Homebrew.**                                          | README: "You need macOS 15 or later and Homebrew". Alternative is `curl ... \| sh`.                                                                                                              | A non-developer cannot get past the first step.                                           |
| 2   | **It runs inside a terminal app, and Full Disk Access is granted to the terminal.** | `ui-copy.ts` permission guide: "turn on the switch for your terminal app (Terminal, iTerm, Ghostty or similar)", then quit and reopen.                                                           | Granting access to a terminal is a bigger, scarier step than granting it to a single app. |
| 3   | **`~/Library` is a black box.**                                                     | Screenshot: `Library` 35 GB, "Not recognized". [web] Common advice for "System Data" is to open Library in Finder and sort by size, so people already end up there manually.                     | This is the main non-developer mystery, and the tool shows a bare folder name.            |
| 4   | **Rules skew to developers; non-developer rules are mostly explain-only.**          | 40 developer/container rules vs. Photos, Messages, Mail, Steam, Trash as explain-only. No rule ids for WhatsApp, Zoom, GarageBand, iMovie, Final Cut, Lightroom, Music/Podcasts (grep of `src`). | The common non-developer space users can be shown but not acted on.                       |
| 5   | **Labels use developer words.**                                                     | Category "Developer files", "Containers & virtual machines", "DerivedData" in titles.                                                                                                            | A first screen full of unfamiliar terms looks like it is for someone else.                |
| 6   | **Mainstream coverage goes to GUI apps.**                                           | [web] Digital Trends covered Radix (GUI). Mole's author built a native app after the CLI.                                                                                                        | Press and non-developer word of mouth follow apps, not terminal tools.                    |

### What I could not establish

- Which non-developer space users actually matter most. Searches name Messages
  attachments, Time Machine snapshots, app and browser caches, Mail downloads,
  cloud-sync copies and swap, but the sources are mostly vendor pages. Do not add
  rules from this list without real data.
- Whether non-developers would use a terminal tool at all.

### Options, with the evidence for each

1. **Fix what a developer-or-not user sees first (low cost).** Explain `~/Library`
   by subfolder (Application Support, Containers, Group Containers, Caches), and
   use words like "Programming tools" for developer categories. Evidence: gap 3
   and gap 5 are visible in the screenshot and the copy.
2. **Collect real data before adding rules.** `whyfull report --json` already
   exists. Ask volunteers to paste their report (the tool has no network code, so
   nothing is collected automatically) and add rules by frequency. Evidence: the
   searches above came from vendor pages, not user data.
3. **Add a double-click way in (higher cost, needs an ADR).** Options range from
   a launcher that opens Terminal for the user to a native app. Evidence for the
   direction: Mole shipped a native app after its CLI and Radix's GUI got
   mainstream coverage. Evidence for the cost is not available; decide after 1 and 2.
4. **Measure before deciding.** GitHub release download counts per asset are
   available without any telemetry. Use them to see whether the curl and brew
   routes are being used.

## Status

Done (branch `ccr-3244e2fd-eaticb`):

- LICENSE (MIT), CONTRIBUTING.md, "Share your report" and "Missing app" issue templates.
- Plainer category names ("Programming tools", "Virtual machines & Docker").
- Explanations for folders whyfull does not recognize (`~/Library`, Application
  Support, Containers, Group Containers, iCloud Drive, Downloads, Desktop,
  Documents, Movies, Music, Pictures), in the side pane and as a label in the
  folder browser.
- `s` on the cleanup-finished screen copies a summary to share.
- Drafts for launch posts: `docs/launch-posts.md`.

Needs the maintainer's Mac:

1. Run `bun run benchmark /Users/<name>/<folder>` and add the numbers to a
   `docs/benchmark.md`. Publish no speed claim before this.
2. Record a short GIF or MP4 (scan, review, cleanup) in a temporary folder, never
   on real files, and add it to the README. Terminal Trove requires it.
3. Check demand without telemetry: GitHub counts release downloads per file.

   ```bash
   gh api repos/behnamazimi/whyfull/releases \
     --jq '.[] | {tag: .tag_name, downloads: [.assets[] | {name, download_count}]}'
   ```

Later, driven by pasted reports and star counts: new rules for the space users
that show up most, Homebrew core (225 stars), the r/macapps main feed (100+
stars, a year of history), and a launcher or app if reports show non-developers
are asking for one.
