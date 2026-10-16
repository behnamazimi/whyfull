import type { AbsolutePath } from "../../domain/index.ts";

const HOME_SYMBOL = "~";
const SEPARATOR = "/";

export function formatPath(path: AbsolutePath, home: AbsolutePath): string {
  const belowHome = path.segmentsBelow(home);
  if (belowHome === undefined) return path.toString();
  return [HOME_SYMBOL, ...belowHome].join(SEPARATOR);
}
