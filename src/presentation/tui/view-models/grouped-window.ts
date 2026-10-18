import { ListEntryKind } from "./list-row.ts";
import { visibleWindow } from "./layout.ts";

export interface EntryWindow {
  readonly start: number;
  readonly end: number;
  readonly hiddenAbove: number;
  readonly hiddenBelow: number;
}

interface Slotted {
  readonly kind: ListEntryKind;
}

const rowsIn = (entries: readonly Slotted[]): number =>
  entries.filter((entry) => entry.kind === ListEntryKind.Row).length;

/** Scrolls over rows and headers together, since the cursor stops on both. */
export function windowEntries(
  entries: readonly Slotted[],
  selectedEntry: number,
  capacity: number,
): EntryWindow {
  const { start, end } = visibleWindow(entries.length, selectedEntry, capacity);
  return {
    start,
    end,
    hiddenAbove: rowsIn(entries.slice(0, start)),
    hiddenBelow: rowsIn(entries.slice(end)),
  };
}
