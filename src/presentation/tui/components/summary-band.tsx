import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { Density } from "../view-models/density.ts";
import type { SummaryView } from "../view-models/summary-view.ts";
import { useColors } from "./color-scheme-context.ts";

export function SummaryBand({ view }: { readonly view: SummaryView }): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column" flexShrink={0}>
      <box flexDirection="column" paddingLeft={1} paddingRight={1}>
        <box flexDirection="row" justifyContent="space-between">
          <text>
            <span fg={colors[view.headlineColor]} attributes={TextAttributes.BOLD}>
              {view.headline}
            </span>
            <span fg={colors.text}>{`${view.headline === "" ? "" : " "}${view.aside}`}</span>
          </text>
          <text fg={colors[view.factColor]}>{view.fact}</text>
        </box>
        <text>
          {view.bar.length === 0
            ? " "
            : view.bar.map((segment, index) => (
                <span key={`${segment.color}-${String(index)}`} fg={colors[segment.color]}>
                  {segment.text}
                </span>
              ))}
        </text>
        {view.density === Density.Compact ? null : (
          <text>
            {view.legend.length === 0
              ? " "
              : view.legend.map((item, index) => (
                  <span key={item.text} fg={colors.muted}>
                    {index === 0 ? "" : "   "}
                    <span fg={colors[item.color]}>{item.glyph}</span>
                    {` ${item.text} `}
                    <span fg={colors.text}>{item.value}</span>
                  </span>
                ))}
          </text>
        )}
        {view.density === Density.Roomy ? (
          <text fg={colors[view.noteColor]}>{view.note ?? " "}</text>
        ) : null}
      </box>
      {view.rule === undefined ? null : <text fg={colors.barTrack}>{view.rule}</text>}
    </box>
  );
}
