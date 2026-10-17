import type { ReactNode } from "react";
import { Layout, type Viewport } from "../view-models/layout.ts";
import type { UserAction } from "../../keymap.ts";
import type { DialogBox } from "../view-models/app-view.ts";
import type { KeyStripView } from "../view-models/key-strip-view.ts";
import { KeyStrip } from "./key-strip.tsx";
import { useColors } from "./color-scheme-context.ts";

/** Every dialog but the high-risk one is drawn the same way: a titled box over the frame. */
export function DialogShell({
  title,
  box,
  viewport,
  keys,
  onAction,
  children,
}: {
  readonly title: string;
  readonly box: DialogBox;
  readonly viewport: Viewport;
  /** The keys that work in the dialog, drawn inside it so they are never mistaken for the screen's. */
  readonly keys: KeyStripView;
  readonly onAction: (action: UserAction) => void;
  readonly children: ReactNode;
}): ReactNode {
  const colors = useColors();
  return (
    <box
      position="absolute"
      top={0}
      left={0}
      width={viewport.columns}
      height={viewport.rows}
      zIndex={Layout.dialogLayer}
      justifyContent="center"
      alignItems="center"
    >
      <box
        flexDirection="column"
        width={box.width}
        height={box.height}
        border
        borderColor={colors.tintMid}
        backgroundColor={colors.dialogBackground}
        title={` ${title} `}
        paddingLeft={2}
        paddingRight={2}
        overflow="hidden"
      >
        <box flexDirection="column" flexGrow={1} overflow="hidden">
          {children}
        </box>
        <KeyStrip view={keys} onAction={onAction} />
      </box>
    </box>
  );
}
