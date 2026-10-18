import { TextAttributes, type MouseEvent } from "@opentui/core";
import type { ReactNode } from "react";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatCount } from "../../format/count-format.ts";
import { checkboxGlyph, Glyph, SelectionState } from "../../theme.ts";
import { useColors } from "./color-scheme-context.ts";
import {
  ListEntryKind,
  type GroupHeader,
  type ListRow,
  type ListView,
  type SectionHeader,
} from "../view-models/list-row.ts";

const SCROLL_DIRECTION_UP = "up";
const EMPTY_CHECKBOX = "   ";
const NO_ARROW = "  ";

export interface ListHandlers {
  readonly onRowClick: (index: number) => void;
  readonly onScroll: (towardsTop: boolean) => void;
}

/** A heading over a dialog's items. It can't be selected. */
export function HeaderLine({ header }: { readonly header: SectionHeader }): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="row" justifyContent="space-between" flexShrink={0} paddingRight={1}>
      <text>
        <span fg={colors[header.color]} attributes={TextAttributes.BOLD}>
          {` ${header.icon} ${header.title}`}
        </span>
        {header.hint === "" ? null : <span fg={colors.muted}>{`  ${header.hint}`}</span>}
      </text>
      <text fg={colors[header.color]}>{header.total}</text>
    </box>
  );
}

/** A group's heading on the main list: the cursor can stop on it, and it opens or folds the group. */
function GroupHeaderLine({
  header,
  onRowClick,
}: {
  readonly header: GroupHeader;
  readonly onRowClick: (index: number) => void;
}): ReactNode {
  const colors = useColors();
  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      flexShrink={0}
      paddingRight={1}
      {...(header.selected ? { backgroundColor: colors.selectionBackground } : {})}
      onMouseDown={() => {
        onRowClick(header.index);
      }}
    >
      <text>
        <span fg={colors.accent}>{header.selected ? Glyph.cursor : " "}</span>
        <span fg={colors.muted}>{header.folded ? Glyph.groupFolded : Glyph.groupOpen}</span>
        <span fg={colors[header.color]} attributes={TextAttributes.BOLD}>
          {` ${header.icon} ${header.title}`}
        </span>
        {header.hint === "" ? null : <span fg={colors.muted}>{`  ${header.hint}`}</span>}
      </text>
      <text fg={colors[header.color]}>{header.total}</text>
    </box>
  );
}

function Row({
  row,
  onRowClick,
}: {
  readonly row: ListRow;
  readonly onRowClick: (index: number) => void;
}): ReactNode {
  const colors = useColors();
  const background = row.selected ? colors.selectionBackground : undefined;
  const checkboxColor = (selection: SelectionState): string => {
    switch (selection) {
      case SelectionState.All:
        return colors.safe;
      case SelectionState.Some:
        return colors.caution;
      case SelectionState.None:
        return colors.muted;
    }
  };
  const titleAttributes = row.selected ? TextAttributes.BOLD : TextAttributes.NONE;
  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      flexShrink={0}
      paddingRight={1}
      {...(background === undefined ? {} : { backgroundColor: background })}
      onMouseDown={() => {
        onRowClick(row.index);
      }}
    >
      <text>
        <span fg={colors.accent}>{row.selected ? Glyph.cursor : " "}</span>
        <span fg={checkboxColor(row.selection)}>
          {row.selectable ? checkboxGlyph[row.selection] : EMPTY_CHECKBOX}
        </span>
        <span fg={colors[row.color]}>{` ${row.icon === "" ? " " : row.icon}`}</span>
        <span fg={colors.text} attributes={titleAttributes}>
          {` ${row.title}`}
        </span>
      </text>
      <text>
        <span fg={colors[row.chipColor]}>{row.chip}</span>
        <span fg={colors.text}>{row.size} </span>
        <span fg={colors[row.barColor]}>{row.bar}</span>
        <span fg={colors.muted}>{row.opens ? ` ${Glyph.pointer}` : NO_ARROW}</span>
      </text>
    </box>
  );
}

export function ListRows({
  view,
  handlers,
}: {
  readonly view: ListView;
  readonly handlers: ListHandlers;
}): ReactNode {
  const colors = useColors();
  return (
    <box
      flexDirection="column"
      flexGrow={1}
      flexShrink={1}
      overflow="hidden"
      onMouseScroll={(event: MouseEvent) => {
        handlers.onScroll(event.scroll?.direction === SCROLL_DIRECTION_UP);
      }}
    >
      <text flexShrink={0} fg={colors.muted}>
        {view.hiddenAbove > 0
          ? ` ${Glyph.more} ${UiCopy.list.moreAbove(formatCount(view.hiddenAbove))}`
          : " "}
      </text>
      {view.entries.map((entry) =>
        entry.kind === ListEntryKind.Header ? (
          <GroupHeaderLine
            key={`header-${entry.title}`}
            header={entry}
            onRowClick={handlers.onRowClick}
          />
        ) : (
          <Row key={entry.index} row={entry} onRowClick={handlers.onRowClick} />
        ),
      )}
      <text flexShrink={0} fg={colors.muted}>
        {view.hiddenBelow > 0
          ? ` ${Glyph.more} ${UiCopy.list.moreBelow(formatCount(view.hiddenBelow))}`
          : " "}
      </text>
    </box>
  );
}
