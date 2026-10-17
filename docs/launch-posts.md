# Launch post drafts

Drafts only. Nothing here has been posted. Fill the `[ ]` slots with real numbers
and a real finding from your own Mac before posting. Patterns come from
`launch-research.md`: name the paid apps replaced (Mole), say the gap (Leaves),
show one real result, state limits, have install and speed numbers ready.

## X post (author voice)

> My Mac said 81% full and I had no idea why.
>
> So I built whyfull: it tells you in plain words what each big thing is, whether
> it's safe to remove, and changes nothing until you review it.
>
> First run found [N GB] I could clear safely, mostly [what it was].
>
> Free, open source, no network code. `brew install behnamazimi/tap/whyfull`
> [GIF]

Follow-ups: release posts in the form "whyfull [version] is live. [what changed].
[N] stars." (the format Mole used).

## Show HN

Title: `Show HN: whyfull – a terminal tool that explains why your Mac disk is full`

Body, in this order:

1. The gap: disk tools show sizes (`du`, `ncdu`, `dua`), but not what a folder is or
   whether it is safe to remove.
2. What it does: every big space user gets a plain name, "what it is" and "if
   removed"; you review a plan; caches are deleted, your files go to the Trash.
3. One real finding from your Mac: [ ].
4. Speed: [`bun run benchmark` numbers against `du`, with the machine]. HN
   threads on disk tools ask about this first.
5. Limits, stated plainly: macOS 15+ only; only cleans what it recognizes; the
   `Library` folder is only explained, not cleaned.
6. Install: brew line and the curl line. Commenters on a similar thread asked
   for a Mac install option.

Expect the question "is this for non-technical people if it needs a terminal?".
Answer: the explanations are written for them; a double-click version waits on
demand shown by reports.

## r/macapps (App Pile megathread format)

- **Name:** whyfull
- **Problem it solves:** Your Mac is full and you can't tell what is using the
  space or what is safe to delete.
- **Compared with:** DaisyDisk shows a map but doesn't say what things are or
  clean for you; CleanMyMac cleans but is a subscription. whyfull explains each
  item and cleans only after you review. [check these claims against the current
  versions before posting]
- **Price and link:** Free, open source (MIT). https://github.com/behnamazimi/whyfull

The main feed needs 100+ stars and a year of GitHub history, otherwise use the
megathread. Read the live rules first.

## Directories

- AlternativeTo: list as an alternative to CleanMyMac and DaisyDisk.
- Terminal Trove: needs the GIF and install steps for brew and curl.

## Search page: "Why is my Mac storage full?"

Draft for a README section or a page. Only facts that are certain:

- System Settings > General > Storage shows what takes space by category.
- macOS counts Time Machine local snapshots as available space, and removes them
  when it needs room (Apple's support page on local snapshots).
- Messages attachments can be reviewed under that same Storage screen.
- Some of the biggest space users live in your `Library` folder, which Finder
  hides by default. whyfull explains that folder and what is in it.

Review each claim against Apple's current pages before publishing.
