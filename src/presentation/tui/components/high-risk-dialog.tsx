import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import type { DialogButtonView, HighRiskDialogView } from "../view-models/high-risk-dialog-view.ts";
import { Layout } from "../view-models/layout.ts";
import { useColors } from "./color-scheme-context.ts";

const BUTTON_GAP = 4;

function DialogButtonLabel({ button }: { readonly button: DialogButtonView }): ReactNode {
  const colors = useColors();
  const text = button.focused ? `[ ${button.label} ]` : `  ${button.label}  `;
  if (!button.enabled) return <span fg={colors.muted}>{text}</span>;
  return (
    <span
      fg={button.focused ? colors.text : colors.muted}
      attributes={button.focused ? TextAttributes.BOLD : TextAttributes.NONE}
    >
      {text}
    </span>
  );
}

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
        <text flexShrink={0} wrapMode="word">
          <span fg={view.acknowledged ? colors.danger : colors.accent}>{view.checkbox}</span>
          <span fg={colors.text}> {view.acknowledgement}</span>
        </text>
        <text flexShrink={0}> </text>
        <box flexDirection="row" justifyContent="center" gap={BUTTON_GAP}>
          {view.buttons.map((button) => (
            <text key={button.label}>
              <DialogButtonLabel button={button} />
            </text>
          ))}
        </box>
      </box>
    </box>
  );
}
