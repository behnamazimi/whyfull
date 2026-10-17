import { UiCopy } from "../../copy/ui-copy.ts";
import { formatPath } from "../../format/path-format.ts";
import type { AppState } from "../state/app-state.ts";

/** Names the scanned folder in a sentence: "your home folder" rather than the shell's `~`. */
export function scopeName(state: AppState): string {
  const { scope, context } = state;
  return scope.root.equals(context.home)
    ? UiCopy.frame.scope.yourHomeFolder
    : formatPath(scope.root, context.home);
}
