import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { useColors } from "./color-scheme-context.ts";
import type { WindowTooSmallView } from "../view-models/window-too-small-view.ts";

export function WindowTooSmallScreen({ view }: { readonly view: WindowTooSmallView }): ReactNode {
  const colors = useColors();
  return (
    <box
      flexDirection="column"
      flexGrow={1}
      justifyContent="center"
      paddingLeft={1}
      paddingRight={1}
      gap={1}
    >
      <text fg={colors.text} attributes={TextAttributes.BOLD} wrapMode="word">
        {view.title}
      </text>
      <text fg={colors.muted} wrapMode="word">
        {view.howToFix}
      </text>
      {view.quit === undefined ? null : (
        <text fg={colors.muted} wrapMode="word">
          {view.quit}
        </text>
      )}
    </box>
  );
}
