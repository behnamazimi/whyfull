import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { Glyph, Palette } from "../../theme.ts";
import type { FooterView } from "../view-models/footer-view.ts";

export function Footer({ view }: { readonly view: FooterView }): ReactNode {
  return (
    <box flexDirection="column" paddingLeft={1} paddingRight={1}>
      <text fg={Palette.caution}>{view.notice ?? " "}</text>
      <text>
        {view.hints.map((hint, index) => (
          <span key={hint.key} fg={Palette.muted}>
            {index === 0 ? "" : Glyph.separator}
            <span fg={Palette.text} attributes={TextAttributes.BOLD}>
              {hint.key}
            </span>{" "}
            {hint.label}
          </span>
        ))}
      </text>
    </box>
  );
}
