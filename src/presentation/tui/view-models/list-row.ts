import type { ColorRole, SelectionState } from "../../theme.ts";

export const ListEntryKind = {
  Row: "row",
  Header: "header",
} as const;
export type ListEntryKind = (typeof ListEntryKind)[keyof typeof ListEntryKind];

export interface ListRow {
  readonly kind: typeof ListEntryKind.Row;
  readonly index: number;
  readonly selected: boolean;
  readonly selection: SelectionState;
  /** A folder or file marker. Safety is never shown as an icon on a row. */
  readonly icon: string;
  /** The colour of the tag. */
  readonly color: ColorRole;
  readonly barColor: ColorRole;
  readonly size: string;
  readonly bar: string;
  readonly title: string;
  /** Muted text after the title, padded by the view-model so notes line up. */
  readonly note: string;
  /** A short word at the right edge, for lists that aren't grouped by safety. */
  readonly tag: string;
}

/** Names a group of rows and says what to do with them. It can't be selected. */
export interface GroupHeader {
  readonly kind: typeof ListEntryKind.Header;
  readonly icon: string;
  readonly color: ColorRole;
  readonly title: string;
  readonly hint: string;
  readonly total: string;
}

export type ListEntry = ListRow | GroupHeader;

export interface ListView {
  readonly entries: readonly ListEntry[];
  /** Rows, not headers, that are scrolled out of sight. */
  readonly hiddenAbove: number;
  readonly hiddenBelow: number;
}
