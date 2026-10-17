import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import type { UserAction } from "../../keymap.ts";
import type { ActionBarView } from "../view-models/action-bar-view.ts";
import { useColors } from "./color-scheme-context.ts";

export function ActionBar({
  view,
  onAction,
}: {
  readonly view: ActionBarView;
  readonly onAction: (action: UserAction) => void;
}): ReactNode {
  const colors = useColors();
  const { button } = view;
  return (
    <box flexDirection="column" flexShrink={0}>
      {view.rule === undefined ? null : <text fg={colors.barTrack}>{view.rule}</text>}
      <box flexDirection="row" justifyContent="space-between" paddingLeft={1} paddingRight={1}>
        <box flexDirection="row" flexShrink={1}>
          {view.parts.map((part, index) => (
            <box
              key={`${part.text}-${String(index)}`}
              flexShrink={0}
              onMouseDown={() => {
                if (part.action !== undefined) onAction(part.action);
              }}
            >
              <text
                fg={colors[part.color]}
                {...(part.bold ? { attributes: TextAttributes.BOLD } : {})}
              >
                {part.text}
              </text>
            </box>
          ))}
        </box>
        {button === undefined ? null : (
          <box
            flexShrink={0}
            onMouseDown={() => {
              if (button.enabled) onAction(button.action);
            }}
          >
            <text>
              <span
                fg={button.enabled ? colors.text : colors.muted}
                bg={colors.selectionBackground}
                attributes={TextAttributes.BOLD}
              >
                {` ${button.key} `}
              </span>
              <span
                fg={button.enabled ? colors.safe : colors.muted}
                {...(button.enabled ? { attributes: TextAttributes.BOLD } : {})}
              >
                {` ${button.label} →`}
              </span>
            </text>
          </box>
        )}
      </box>
    </box>
  );
}
