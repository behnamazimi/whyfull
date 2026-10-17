import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import type { UserAction } from "../../keymap.ts";
import { Glyph } from "../../theme.ts";
import type { KeyStripView } from "../view-models/key-strip-view.ts";
import { useColors } from "./color-scheme-context.ts";

export function KeyStrip({
  view,
  onAction,
}: {
  readonly view: KeyStripView;
  readonly onAction: (action: UserAction) => void;
}): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="row" flexShrink={0} paddingLeft={1} paddingRight={1}>
      {view.hints.flatMap((item, index) => [
        index === 0 ? null : (
          <text key={`gap-${String(index)}`} fg={colors.muted}>
            {Glyph.separator}
          </text>
        ),
        <box
          key={`${item.key}-${item.label}`}
          flexShrink={0}
          onMouseDown={() => {
            if (item.action !== undefined) onAction(item.action);
          }}
        >
          <text fg={colors.muted}>
            <span fg={colors.text} attributes={TextAttributes.BOLD}>
              {item.key}
            </span>
            {` ${item.label}`}
          </text>
        </box>,
      ])}
    </box>
  );
}
