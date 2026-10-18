import type { ColorRole, SelectionState } from "../../theme.ts";

export const ListEntryKind = {
  Row: "row",
  Header: "header",
} as const;
export type ListEntryKind = (typeof ListEntryKind)[keyof typeof ListEntryKind];

/** Every list in the app shows rows in this one shape, so no screen lays out its own. */
export interface ListRow {
  readonly kind: typeof ListEntryKind.Row;
  readonly index: number;
  readonly selected: boolean;
  readonly selection: SelectionState;
  /** False for rows that can't be added to a cleanup. Their checkbox is left empty. */
  readonly selectable: boolean;
  /** A folder, file or warning marker, empty when the row needs none. */
  readonly icon: string;
  readonly color: ColorRole;
  readonly barColor: ColorRole;
  readonly size: string;
  readonly bar: string;
  readonly title: string;
  /** What happens to the row, already padded to its column. Empty in a window with no pane. */
  readonly chip: string;
  readonly chipColor: ColorRole;
  /** True when pressing enter or clicking goes somewhere, which an arrow at the row's end says. */
  readonly opens: boolean;
}

/** A heading over some rows, in a dialog or on a list. */
export interface SectionHeader {
  readonly kind: typeof ListEntryKind.Header;
  readonly icon: string;
  readonly color: ColorRole;
  readonly title: string;
  readonly hint: string;
  readonly total: string;
}

/** A group's heading on the main list. The cursor stops on it, and enter folds the group or opens it. */
export interface GroupHeader extends SectionHeader {
  readonly index: number;
  readonly selected: boolean;
  readonly folded: boolean;
}

export type ListEntry = ListRow | GroupHeader;

export interface ListView {
  readonly entries: readonly ListEntry[];
  /** Rows, not headers, that are scrolled out of sight. */
  readonly hiddenAbove: number;
  readonly hiddenBelow: number;
}
