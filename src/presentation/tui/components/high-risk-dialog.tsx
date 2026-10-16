import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import type { HighRiskDialogView } from "../view-models/high-risk-dialog-view.ts";
import { Layout } from "../view-models/layout.ts";
import { useColors } from "./color-scheme-context.ts";

const ACTION_GAP = 4;

export function HighRiskDialog({
  view,
  width,
  height,
}: {
  readonly view: HighRiskDialogView;
  readonly width: number;
  readonly height: number;
}): ReactNode {
  const colors = useColors();
  return (
    <box
      position="absolute"
      top={0}
      left={0}
      width={width}
      height={height}
      zIndex={Layout.dialogLayer}
      justifyContent="center"
      alignItems="center"
    >
      <box
        flexDirection="column"
        width={view.width}
        border
        borderColor={colors.danger}
        backgroundColor={colors.dialogBackground}
        title={` ${view.title} `}
        paddingLeft={2}
        paddingRight={2}
        paddingTop={1}
        paddingBottom={1}
      >
        <text flexShrink={0} fg={colors.text} wrapMode="word">
          {view.body}
        </text>
        <text flexShrink={0}> </text>
        <text flexShrink={0} wrapMode="word">
          <span fg={colors.safe} attributes={TextAttributes.BOLD}>
            {view.keptHeading}
          </span>
          <span fg={colors.text}> {view.kept}</span>
        </text>
        <text flexShrink={0}> </text>
        <text flexShrink={0} fg={colors.muted} wrapMode="word">
          {view.followUp}
        </text>
        <text flexShrink={0}> </text>
        <box flexDirection="row" justifyContent="center" gap={ACTION_GAP}>
          {view.actions.map((action) => (
            <text key={action.key}>
              <span fg={colors.text} attributes={TextAttributes.BOLD}>
                {action.key}
              </span>
              <span fg={colors.muted}> {action.label}</span>
            </text>
          ))}
        </box>
      </box>
    </box>
  );
}
