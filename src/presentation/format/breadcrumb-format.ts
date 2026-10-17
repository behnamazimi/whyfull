import { Glyph } from "../theme.ts";

const PATH_SEPARATOR = "/";

/** `~/Library/Caches` becomes `~ › Library › Caches`; `/Volumes/Disk` keeps its leading slash. */
export function formatBreadcrumb(path: string): string {
  const parts = path.split(PATH_SEPARATOR).filter((part) => part !== "");
  return (path.startsWith(PATH_SEPARATOR) ? [PATH_SEPARATOR, ...parts] : parts).join(
    Glyph.breadcrumb,
  );
}
