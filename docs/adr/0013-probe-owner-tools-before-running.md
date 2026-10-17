# 0013 — Owner tools are probed before review and again before running

**Status:** accepted.

## Context

"Owner tool available" meant the executable was on the path. On macOS that is
not enough:

- `/usr/bin/xcrun` exists without full Xcode, so `xcrun simctl` failed after the
  person confirmed, with `unable to find utility "simctl"`.
- `docker` exists while Docker Desktop is stopped, or while the `docker` command
  talks to another engine such as OrbStack.

The failure then showed raw tool output, advice to "try again" that could never
help, and "0 bytes more free space" as the headline.

## Decision

- **Each owner tool carries its own probes**: cheap commands that must succeed
  and, where needed, print an expected value. A probe maps to a closed set of
  problems (not installed, can't run, not running, not responding, wrong
  engine). A tool can't be added without a probe.
- **Probes run when the plan is made.** A failing probe leaves the item out of
  the plan with a plain reason, so it can't be confirmed.
- **Probes run again right before the tool.** If the tool stopped being ready
  after review, the action fails without running it.
- **Probes use the quick command timeout.** A tool that doesn't answer is
  treated as not responding, so the review stays responsive.
- **A failed run keeps its cause.** The report explains it in plain words and
  never suggests trying again. The tool's own output stays in the journal.
- **The report says "Nothing was cleaned"** when no action succeeded, instead of
  a free-space gain of 0.
- **Docker keeps `--all`**, and the review says images are downloaded again when
  needed.

## Consequences

- Space that only an unavailable tool could free (for example simulators left
  behind by a removed Xcode) is explained, not freed. There is no fallback that
  deletes it by hand.
- A probe can pass and the run can still fail. Those failures are reported with
  their cause.
- The expected Docker Desktop engine name is a named constant. It needs
  checking on a real Mac with `docker info --format '{{.OperatingSystem}}'`.
