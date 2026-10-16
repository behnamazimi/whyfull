import { TextAttributes, type MouseEvent } from "@opentui/core";
import type { ReactNode } from "react";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatCount } from "../../format/count-format.ts";
import { checkboxGlyph, SelectionState } from "../../theme.ts";
import { useColors } from "./color-scheme-context.ts";
import { Layout } from "../view-models/layout.ts";
import type { ListRow, ListView } from "../view-models/list-row.ts";

const MORE_MARKER = "⋯";
const SCROLL_DIRECTION_UP = "up";

export interface ListHandlers {
  readonly onRowClick: (index: number) => void;
  readonly onScroll: (towardsTop: boolean) => void;
}

function Row({
  row,
  compact,
  onRowClick,
}: {
  readonly row: ListRow;
  readonly compact: boolean;
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
  const hasIcon = row.icon !== "";
  const titleAttributes = row.selected ? TextAttributes.BOLD : TextAttributes.NONE;
  return (
    <box
      flexDirection="column"
      flexShrink={0}
      paddingLeft={1}
      paddingRight={1}
      {...(background === undefined ? {} : { backgroundColor: background })}
      onMouseDown={() => {
        onRowClick(row.index);
      }}
    >
      <box flexDirection="row" justifyContent="space-between">
        <text>
          <span fg={checkboxColor(row.selection)}>{checkboxGlyph[row.selection]}</span>
          {hasIcon ? <span fg={colors[row.color]}> {row.icon}</span> : null}
          <span fg={colors.text}> {row.size} </span>
          <span fg={colors.bar}>{row.bar}</span>
          <span fg={colors.text} attributes={titleAttributes}>
            {" "}
            {row.title}
          </span>
          {compact ? <span fg={colors.muted}> {row.detail}</span> : null}
        </text>
        <text fg={colors[row.color]}>{row.tag}</text>
      </box>
      {compact ? null : (
        <box paddingLeft={Layout.rowTitleOffset + (hasIcon ? Layout.rowIconWidth : 0)}>
          <text fg={colors.muted}>{row.detail}</text>
        </box>
      )}
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
          ? ` ${MORE_MARKER} ${UiCopy.list.moreAbove(formatCount(view.hiddenAbove))}`
          : " "}
      </text>
      {view.rows.map((row) => (
        <Row key={row.index} row={row} compact={view.compact} onRowClick={handlers.onRowClick} />
      ))}
      <text flexShrink={0} fg={colors.muted}>
        {view.hiddenBelow > 0
          ? ` ${MORE_MARKER} ${UiCopy.list.moreBelow(formatCount(view.hiddenBelow))}`
          : " "}
      </text>
    </box>
  );
}
