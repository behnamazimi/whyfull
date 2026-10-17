import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { Glyph } from "../../theme.ts";
import { useColors } from "./color-scheme-context.ts";
import type { CartBarView } from "../view-models/cart-bar-view.ts";

export function CartBar({ view }: { readonly view: CartBarView }): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column">
      <text fg={colors.barTrack}>{view.rule}</text>
      <box paddingLeft={1} paddingRight={1}>
        <text>
          {view.summary === undefined ? null : (
            <span fg={colors[view.color]} attributes={TextAttributes.BOLD}>
              {view.summary}
              {Glyph.separator}
            </span>
          )}
          {view.parts.map((part, index) => (
            <span key={part.text}>
              {index === 0 ? "" : " "}
              {part.isKey ? (
                <span
                  fg={colors.text}
                  bg={colors.selectionBackground}
                  attributes={TextAttributes.BOLD}
                >{` ${part.text} `}</span>
              ) : (
                <span fg={colors[view.color]}>{part.text}</span>
              )}
            </span>
          ))}
        </text>
      </box>
      <text fg={colors.barTrack}>{view.rule}</text>
    </box>
  );
}
