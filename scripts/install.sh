#!/bin/sh
# Builds whyfull from source and installs it for the current user.
set -eu

install_dir="${WHYFULL_INSTALL_DIR:-$HOME/.local/bin}"
case "$(uname -m)" in
  arm64) binary="dist/whyfull-darwin-arm64" ;;
  x86_64) binary="dist/whyfull-darwin-x64" ;;
  *) echo "whyfull runs on Apple silicon and Intel Macs only." >&2; exit 1 ;;
esac

bun install
bun run build
mkdir -p "$install_dir"
install -m 755 "$binary" "$install_dir/whyfull"
echo "Installed whyfull to $install_dir/whyfull"
case ":$PATH:" in
  *":$install_dir:"*) ;;
  *) echo "Add $install_dir to your PATH to run whyfull from anywhere." ;;
esac
