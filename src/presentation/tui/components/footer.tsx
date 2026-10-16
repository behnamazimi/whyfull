import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { Glyph } from "../../theme.ts";
import { useColors } from "./color-scheme-context.ts";
import type { FooterView } from "../view-models/footer-view.ts";

export function Footer({ view }: { readonly view: FooterView }): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column" paddingLeft={1} paddingRight={1}>
      <text fg={colors.caution}>{view.notice ?? " "}</text>
      {view.hintRows.map((row) => (
        <text key={row.map((hint) => hint.key).join()}>
          {row.map((hint, index) => (
            <span key={hint.key} fg={colors.muted}>
              {index === 0 ? "" : Glyph.separator}
              <span fg={colors.text} attributes={TextAttributes.BOLD}>
                {hint.key}
              </span>{" "}
              {hint.label}
            </span>
          ))}
        </text>
      ))}
    </box>
  );
}
