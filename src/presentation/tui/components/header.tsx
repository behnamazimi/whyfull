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
      <box paddingLeft={1}>
        <text>
          <span fg={colors.accent} attributes={TextAttributes.BOLD}>
            {view.appName}
          </span>
          <span fg={colors.muted}>
            {Glyph.separator}
            {view.location}
          </span>
        </text>
      </box>
      <text fg={colors.barTrack}>{view.rule}</text>
      <box flexDirection="column" paddingLeft={1}>
        <text>
          <Label text={view.disk.label} />
          {view.disk.bar.length === 0 ? null : (
            <span fg={colors[view.disk.color]}>{view.disk.bar} </span>
          )}
          <span fg={view.disk.bar.length === 0 ? colors.muted : colors.text}>{view.disk.text}</span>
        </text>
        <StatusLine row={view.scan} />
      </box>
      <text fg={colors.barTrack}>{view.rule}</text>
    </box>
  );
}
