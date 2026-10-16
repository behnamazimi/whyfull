#!/usr/bin/env bash
# Cuts a release end to end: bump, pull request, merge, tag, and watch the build.
#
#   scripts/release.sh patch|minor|major|X.Y.Z[-pre.N] [--dry-run]
#
# Run it from an up-to-date main with a clean working tree. The tag push starts
# .github/workflows/release.yml, which builds, attests, and publishes the binaries.
set -euo pipefail

readonly main_branch="main"
readonly pending_branch="release/pending"
readonly merge_method="${WHYFULL_MERGE_METHOD:-squash}"
readonly semver_pattern='^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$'

dry_run=false
bump=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) dry_run=true ;;
    -*) echo "Unknown option: $arg" >&2; exit 2 ;;
    *) bump="$arg" ;;
  esac
done
if [ -z "$bump" ]; then
  echo "Usage: scripts/release.sh patch|minor|major|X.Y.Z [--dry-run]" >&2
  exit 2
fi

step() { printf '\n==> %s\n' "$*"; }
die() { printf 'Error: %s\n' "$*" >&2; exit 1; }
run() { if $dry_run; then printf '[dry run] %s\n' "$*"; else "$@"; fi; }

cd "$(git rev-parse --show-toplevel)"

step "Checking that the release can start"
command -v gh >/dev/null || die "Install the GitHub CLI first: brew install gh"
command -v bun >/dev/null || die "Install Bun first."
gh auth status >/dev/null 2>&1 || die "Run 'gh auth login' first."
git remote get-url origin >/dev/null 2>&1 || die "This repo has no 'origin' remote yet."
[ "$(git branch --show-current)" = "$main_branch" ] || die "Switch to $main_branch first."
[ -z "$(git status --porcelain)" ] || die "The working tree has uncommitted changes."
git fetch --quiet origin "$main_branch" --tags
[ "$(git rev-parse HEAD)" = "$(git rev-parse "origin/$main_branch")" ] \
  || die "Local $main_branch differs from origin/$main_branch. Pull or push first."
git show-ref --quiet "refs/heads/$pending_branch" && die "Branch $pending_branch already exists. Delete it first."

current="$(bun pm pkg get version | tr -d '"')"
[[ "$current" =~ $semver_pattern ]] || die "package.json version '$current' is not valid."
core="${current%%-*}"
IFS=. read -r major minor patch <<<"$core"
case "$bump" in
  major) next="$((major + 1)).0.0" ;;
  minor) next="$major.$((minor + 1)).0" ;;
  patch) next="$major.$minor.$((patch + 1))" ;;
  *) next="${bump#v}" ;;
esac
[[ "$next" =~ $semver_pattern ]] || die "'$bump' is not patch, minor, major, or a version like 1.2.3."
[ "$next" != "$current" ] || die "Version $next is already the current version."
tag="v$next"
release_branch="release/$tag"
git rev-parse --quiet --verify "refs/tags/$tag" >/dev/null && die "Tag $tag already exists."
git ls-remote --exit-code --heads origin "$release_branch" >/dev/null 2>&1 \
  && die "Branch $release_branch already exists on origin."
echo "Releasing $current -> $next ($tag)"

step "Running the full check on $main_branch"
bun install --frozen-lockfile
bun run check

step "Creating $pending_branch and bumping the version"
run git switch -c "$pending_branch"
run bun pm pkg set "version=$next"
run git commit --quiet -am "Release $tag"

step "Renaming the branch to $release_branch and opening a pull request"
run git branch -m "$pending_branch" "$release_branch"
run git push --set-upstream origin "$release_branch"
run gh pr create --base "$main_branch" --head "$release_branch" \
  --title "Release $tag" --body "Bumps whyfull to $next. Merging this lets the release script tag $tag."

step "Waiting for the pull request checks"
if ! $dry_run; then
  # Checks take a moment to register after the pull request opens.
  until gh pr checks "$release_branch" >/dev/null 2>&1 || [ "${waited:-0}" -ge 30 ]; do
    sleep 2
    waited=$((${waited:-0} + 1))
  done
  gh pr checks "$release_branch" --watch --fail-fast \
    || die "Checks failed. Fix them on $release_branch, then merge and tag by hand."
else
  echo "[dry run] gh pr checks $release_branch --watch --fail-fast"
fi

step "Merging the pull request"
run gh pr merge "$release_branch" "--$merge_method" --delete-branch

step "Tagging $tag on the merged $main_branch"
run git switch "$main_branch"
run git pull --quiet --ff-only origin "$main_branch"
run git tag -a "$tag" -m "whyfull $next"
run git push origin "$tag"

step "Watching the release build"
if ! $dry_run; then
  sleep 5
  run_id="$(gh run list --workflow release.yml --branch "$tag" --limit 1 --json databaseId --jq '.[0].databaseId')"
  [ -n "$run_id" ] || die "The release workflow did not start. Check the Actions tab."
  gh run watch "$run_id" --exit-status || die "The release build failed: $(gh run view "$run_id" --json url --jq .url)"
  step "Done"
  gh release view "$tag" --json url --jq .url
else
  echo "[dry run] gh run watch (release.yml for $tag)"
  step "Dry run finished. Nothing was changed."
fi
