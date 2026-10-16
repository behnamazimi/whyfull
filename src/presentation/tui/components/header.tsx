import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { Glyph } from "../../theme.ts";
import { useColors } from "./color-scheme-context.ts";
import type { HeaderView, StatusRow } from "../view-models/header-view.ts";

const LABEL_COLUMN_WIDTH = 6;

function Label({ text }: { readonly text: string }): ReactNode {
  const colors = useColors();
  return <span fg={colors.muted}>{text.padEnd(LABEL_COLUMN_WIDTH)}</span>;
}

function StatusLine({ row }: { readonly row: StatusRow }): ReactNode {
  const colors = useColors();
  return (
    <text>
      <Label text={row.label} />
      <span fg={colors[row.color]}>{row.text}</span>
    </text>
  );
}

export function Header({ view }: { readonly view: HeaderView }): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column">
      <box flexDirection="row" justifyContent="space-between" paddingLeft={1} paddingRight={1}>
        <text>
          <span fg={colors.accent} attributes={TextAttributes.BOLD}>
            {view.appName}
          </span>
          <span fg={colors.muted}>
            {Glyph.separator}
            {view.location}
          </span>
        </text>
        {view.cleanup === undefined ? null : <text fg={colors.safe}>{view.cleanup}</text>}
      </box>
      <text fg={colors.barTrack}>{view.rule}</text>
      <box flexDirection="column" paddingLeft={1}>
        <text>
          <Label text={view.disk.label} />
          {view.disk.segments.map((segment, index) => (
            <span key={`${segment.color}-${String(index)}`} fg={colors[segment.color]}>
              {segment.text}
            </span>
          ))}
          <span fg={view.disk.segments.length === 0 ? colors.muted : colors.text}>
            {view.disk.segments.length === 0 ? "" : " "}
            {view.disk.text}
          </span>
        </text>
        <StatusLine row={view.scan} />
      </box>
      <text fg={colors.barTrack}>{view.rule}</text>
    </box>
  );
}
