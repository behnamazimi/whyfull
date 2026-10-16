import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { Glyph, Palette } from "../../theme.ts";
import type { HeaderView, StatusRow } from "../view-models/header-view.ts";

const LABEL_COLUMN_WIDTH = 6;

function Label({ text }: { readonly text: string }): ReactNode {
  return <span fg={Palette.muted}>{text.padEnd(LABEL_COLUMN_WIDTH)}</span>;
}

function StatusLine({ row }: { readonly row: StatusRow }): ReactNode {
  return (
    <text>
      <Label text={row.label} />
      <span fg={row.color}>{row.text}</span>
    </text>
  );
}

export function Header({ view }: { readonly view: HeaderView }): ReactNode {
  return (
    <box flexDirection="column">
      <box paddingLeft={1}>
        <text>
          <span fg={Palette.accent} attributes={TextAttributes.BOLD}>
            {view.appName}
          </span>
          <span fg={Palette.muted}>
            {Glyph.separator}
            {view.location}
          </span>
        </text>
      </box>
      <text fg={Palette.barTrack}>{view.rule}</text>
      <box flexDirection="column" paddingLeft={1}>
        <text>
          <Label text={view.disk.label} />
          {view.disk.bar.length === 0 ? null : <span fg={view.disk.color}>{view.disk.bar} </span>}
          <span fg={view.disk.bar.length === 0 ? Palette.muted : Palette.text}>
            {view.disk.text}
          </span>
        </text>
        <StatusLine row={view.scan} />
      </box>
      <text fg={Palette.barTrack}>{view.rule}</text>
    </box>
  );
}
