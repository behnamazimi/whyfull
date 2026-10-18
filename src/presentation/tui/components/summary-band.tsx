import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { Density } from "../view-models/density.ts";
import type { SummaryView, TextPart } from "../view-models/summary-view.ts";
import { useColors } from "./color-scheme-context.ts";

export function SummaryBand({ view }: { readonly view: SummaryView }): ReactNode {
  const colors = useColors();
  const parts = (list: readonly TextPart[]): ReactNode =>
    list.map((part, index) => (
      <span
        key={`${part.color}-${String(index)}`}
        fg={colors[part.color]}
        {...(part.bold ? { attributes: TextAttributes.BOLD } : {})}
      >
        {part.text}
      </span>
    ));
  return (
    <box flexDirection="column" flexShrink={0}>
      <box flexDirection="column" paddingLeft={1} paddingRight={1}>
        <box flexDirection="row" justifyContent="space-between">
          <text>{view.heading.length === 0 ? " " : parts(view.heading)}</text>
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
          {parts(
            view.tail.map((part, index) =>
              index === 0 ? { ...part, text: ` ${part.text}` } : part,
            ),
          )}
        </text>
        {view.density === Density.Roomy ? (
          <text fg={colors[view.noteColor]}>{view.note ?? " "}</text>
        ) : null}
      </box>
      {view.rule === undefined ? null : <text fg={colors.barTrack}>{view.rule}</text>}
    </box>
  );
}
