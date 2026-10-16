import type { ColorRole, SelectionState } from "../../theme.ts";

export interface ListRow {
  readonly index: number;
  readonly selected: boolean;
  readonly selection: SelectionState;
  readonly icon: string;
  readonly color: ColorRole;
  readonly size: string;
  readonly bar: string;
  readonly title: string;
  readonly detail: string;
  readonly tag: string;
}

export interface ListView {
  readonly compact: boolean;
  readonly rows: readonly ListRow[];
  readonly hiddenAbove: number;
  readonly hiddenBelow: number;
}
