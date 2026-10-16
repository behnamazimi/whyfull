#!/bin/sh
# Installs the latest whyfull release for the current user.
#
#   curl -fsSL https://raw.githubusercontent.com/behnamazimi/whyfull/main/scripts/install.sh | sh
#
# WHYFULL_VERSION=v0.2.0 installs that release instead of the latest.
# WHYFULL_INSTALL_DIR changes where the binary goes (default: ~/.local/bin).
set -eu

repo="behnamazimi/whyfull"

fail() {
  echo "whyfull install failed: $*" >&2
  exit 1
}

# Everything runs inside a function so a download cut short mid-script runs nothing.
main() {
  [ "$(uname -s)" = "Darwin" ] || fail "whyfull runs on macOS only."
  case "$(uname -m)" in
    arm64) arch="arm64" ;;
    x86_64) arch="x64" ;;
    *) fail "whyfull runs on Apple silicon and Intel Macs only." ;;
  esac

  install_dir="${WHYFULL_INSTALL_DIR:-$HOME/.local/bin}"

  tag="${WHYFULL_VERSION:-}"
  if [ -z "$tag" ]; then
    # The "latest" page redirects to the newest stable release, so no API call or login is needed.
    latest_url="$(curl -fsSL -o /dev/null -w '%{url_effective}' "https://github.com/$repo/releases/latest")" \
      || fail "could not look up the latest release."
    tag="${latest_url##*/}"
  fi
  case "$tag" in
    v[0-9]*.[0-9]*.[0-9]*) ;;
    *) fail "unexpected release name: $tag" ;;
  esac

  asset="whyfull-$tag-darwin-$arch.tar.gz"
  base_url="https://github.com/$repo/releases/download/$tag"
  workdir="$(mktemp -d)"
  trap 'rm -rf "$workdir"' EXIT

  echo "Downloading whyfull $tag for $arch..."
  curl -fsSL -o "$workdir/$asset" "$base_url/$asset" || fail "could not download $asset."
  curl -fsSL -o "$workdir/SHA256SUMS" "$base_url/SHA256SUMS" || fail "could not download the checksums."

  expected="$(awk -v name="$asset" '$2 == name { print $1 }' "$workdir/SHA256SUMS")"
  actual="$(shasum -a 256 "$workdir/$asset" | awk '{ print $1 }')"
  [ -n "$expected" ] || fail "no checksum is listed for $asset."
  [ "$expected" = "$actual" ] || fail "the download does not match its checksum, so nothing was installed."

  tar -xzf "$workdir/$asset" -C "$workdir" whyfull
  mkdir -p "$install_dir"
  install -m 755 "$workdir/whyfull" "$install_dir/whyfull"

  echo "Installed whyfull $tag to $install_dir/whyfull"
  case ":$PATH:" in
    *":$install_dir:"*) echo "Run: whyfull" ;;
    *)
      echo "To run it from anywhere, add this line to ~/.zshrc and open a new terminal:"
      echo "  export PATH=\"$install_dir:\$PATH\""
      ;;
  esac
}

main
