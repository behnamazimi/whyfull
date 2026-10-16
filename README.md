<div align="center">

# whyfull

**Your disk is full and you don't know why. Find out in plain language, then free space safely.**

It shows what is using your space, says what is safe to remove, and changes nothing until you review and confirm.

<img src="docs/whyfull-1.png" alt="whyfull screenshot" />

</div>

## Install

You need macOS 15 or later and [Homebrew](https://brew.sh).

```bash
brew install behnamazimi/tap/whyfull
```

Update later with `brew upgrade whyfull`.

No Homebrew? This downloads the latest release, checks its checksum, and installs `whyfull` to `~/.local/bin`:

```bash
curl -fsSL https://raw.githubusercontent.com/behnamazimi/whyfull/main/scripts/install.sh | sh
```

Run it again to update.

## Quickstart

```bash
whyfull
whyfull ~/Downloads
whyfull report
```

The first command looks through your home folder, the second through one folder, and the third prints a summary and exits. The bottom line of the screen always shows the keys you can use.

## What you can do

- **See where it went:** every big space user gets a plain name and a short explanation, so you never have to guess what a folder is for.
- **Clean up with a safety net:** pick what to remove, review the plan, then confirm. Caches that apps rebuild are deleted. Your own files go to the Trash, where you can still change your mind.
- **Catch what's growing:** press `g` to see what has grown since your last scan.
- **Look at everything:** press `w` to scan the whole disk, or start with `whyfull --whole-disk`.
- **Script it:** run `whyfull report --json` to get the same summary as JSON.

## Notes

- Nothing leaves your Mac. whyfull has no network code.
- whyfull only cleans what it recognizes. For anything else, high-risk mode (`x`) lets you delete files in your home folder yourself. They are deleted for good, so you confirm by typing `delete`.
