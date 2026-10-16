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

/** Scrolls over rows and headers together. A window never starts just under its group's header. */
export function windowEntries(
  entries: readonly Slotted[],
  selectedEntry: number,
  capacity: number,
): EntryWindow {
  const window = visibleWindow(entries.length, selectedEntry, capacity);
  const first = entries[window.start];
  const before = entries[window.start - 1];
  const start =
    first?.kind === ListEntryKind.Row && before?.kind === ListEntryKind.Header
      ? window.start - 1
      : window.start;
  const end = Math.min(window.end, start + Math.max(1, capacity));
  return {
    start,
    end,
    hiddenAbove: rowsIn(entries.slice(0, start)),
    hiddenBelow: rowsIn(entries.slice(end)),
  };
}
