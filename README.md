<div align="center">

# whyfull

**Your disk is full and you don't know why. Find out in plain language, then free space safely**

It shows what is using your space, says what is safe to remove, and changes nothing until you review and confirm.

</div>

## Install

You need macOS 15 or later and [Bun](https://bun.sh) 1.4.3 or later.

```bash
git clone https://github.com/behnamazimi/whyfull.git
cd whyfull
./scripts/install.sh
```

The script installs `whyfull` to `~/.local/bin` and tells you if that folder is missing from your `PATH`.

## Quickstart

```bash
whyfull
whyfull ~/Downloads
whyfull report
```

The first command looks through your home folder, the second through one folder, and the third prints a summary and exits. The bottom line of the screen always shows the keys you can use.

## What you can do

- See what is using your space, named in plain language, so you don't have to guess what a folder is for.
- Pick what to remove, review the plan, then confirm. Caches that apps rebuild are deleted. Your own files go to the Trash.
- Press `g` to see what has grown since your last scan.
- Press `w` to look at the whole disk, or start with `whyfull --whole-disk`.
- Run `whyfull report --json` to get the same summary as JSON for scripts.

## Notes

- Nothing leaves your Mac. whyfull has no network code.
- whyfull only cleans what it recognizes. For anything else, high-risk mode (`x`) lets you delete files in your home folder yourself. They are deleted for good, so you confirm by typing `delete`.
