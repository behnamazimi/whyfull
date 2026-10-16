import { TextAttributes, type MouseEvent } from "@opentui/core";
import type { ReactNode } from "react";
import { Glyph, Palette } from "../../theme.ts";
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
  const background = row.selected ? Palette.selectionBackground : undefined;
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
          <span fg={Palette.safe}>{row.marked ? Glyph.marked : " "}</span>
          <span fg={row.color}>{row.icon}</span>
          <span fg={Palette.text}> {row.size} </span>
          <span fg={Palette.bar}>{row.bar}</span>
          <span fg={Palette.text} attributes={titleAttributes}>
            {" "}
            {row.title}
          </span>
          {compact ? <span fg={Palette.muted}> {row.detail}</span> : null}
        </text>
        <text fg={row.color}>{row.tag}</text>
      </box>
      {compact ? null : (
        <text fg={Palette.muted}>
          {"   "}
          {row.detail}
        </text>
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
      <text flexShrink={0} fg={Palette.muted}>
        {view.hiddenAbove > 0 ? ` ${MORE_MARKER}` : " "}
      </text>
      {view.rows.map((row) => (
        <Row key={row.index} row={row} compact={view.compact} onRowClick={handlers.onRowClick} />
      ))}
      <text flexShrink={0} fg={Palette.muted}>
        {view.hiddenBelow > 0 ? ` ${MORE_MARKER}` : " "}
      </text>
    </box>
  );
}
