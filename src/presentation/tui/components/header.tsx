import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { Palette } from "../../theme.ts";
import type { HeaderView } from "../view-models/header-view.ts";
import { shareBar } from "../view-models/layout.ts";

const FULL_DISK_WARNING_SHARE = 0.9;

export function Header({ view }: { readonly view: HeaderView }): ReactNode {
  const diskColor =
    view.diskShareUsed !== undefined && view.diskShareUsed >= FULL_DISK_WARNING_SHARE
      ? Palette.keep
      : Palette.accent;
  return (
    <box flexDirection="column" paddingLeft={1} paddingRight={1}>
      <text>
        <span fg={Palette.accent} attributes={TextAttributes.BOLD}>
          {view.appName}
        </span>
      </text>
      <text>
        <span fg={Palette.text}>{view.diskLine} </span>
        {view.diskShareUsed === undefined ? null : (
          <span fg={diskColor}>{shareBar(view.diskShareUsed)}</span>
        )}
      </text>
      <text fg={view.scanRunning ? Palette.caution : Palette.muted}>{view.scanLine}</text>
      <text> </text>
    </box>
  );
}
