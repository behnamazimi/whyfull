import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import type { UserAction } from "../../keymap.ts";
import { ScreenKind } from "../state/screen.ts";
import type { BodyScreenView } from "../view-models/app-view.ts";
import type { BodyView } from "../view-models/body-view.ts";
import type { FindingDetailView } from "../view-models/finding-detail-view.ts";
import { Layout } from "../view-models/layout.ts";
import { useColors } from "./color-scheme-context.ts";
import { DetailHeading, DetailPane, DetailSections } from "./detail-pane.tsx";
import { ListRows, type ListHandlers } from "./list-rows.tsx";

export interface BodyHandlers extends ListHandlers {
  readonly onAction: (action: UserAction) => void;
}

/** The rows (or a message when there are none) and, in a narrow window, a strip about the chosen row. */
function ListColumn({
  view,
  handlers,
}: {
  readonly view: BodyView;
  readonly handlers: BodyHandlers;
}): ReactNode {
  const colors = useColors();
  return (
    <>
      {view.emptyMessage === undefined ? (
        <ListRows view={view} handlers={handlers} />
      ) : (
        <box flexGrow={1} paddingLeft={1} paddingRight={1} paddingTop={1} overflow="hidden">
          <text fg={colors.muted} wrapMode="word">
            {view.emptyMessage}
          </text>
        </box>
      )}
      {view.pane !== undefined ? null : <DetailStrip lines={view.strip} />}
    </>
  );
}

/** The chosen row in `Layout.stripLines` lines, kept the same height so the list doesn't jump. */
function DetailStrip({ lines }: { readonly lines: BodyView["strip"] }): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column" flexShrink={0}>
      {Array.from({ length: Layout.stripLines }, (_, index) => {
        const line = lines[index];
        return (
          <text
            key={index}
            fg={line === undefined ? colors.muted : colors[line.color]}
            {...(index === 0 ? { attributes: TextAttributes.BOLD } : {})}
          >
            {line === undefined ? " " : ` ${line.text}`}
          </text>
        );
      })}
    </box>
  );
}

function ListWithPane({
  view,
  handlers,
}: {
  readonly view: BodyView;
  readonly handlers: BodyHandlers;
}): ReactNode {
  const colors = useColors();
  if (view.pane === undefined) {
    return (
      <box flexDirection="column" flexGrow={1} overflow="hidden">
        <ListColumn view={view} handlers={handlers} />
      </box>
    );
  }
  return (
    <box flexDirection="row" flexGrow={1} overflow="hidden">
      <box flexDirection="column" flexGrow={1} flexShrink={1} overflow="hidden">
        <ListColumn view={view} handlers={handlers} />
      </box>
      <box
        flexDirection="column"
        width={Layout.detailPaneColumns}
        flexShrink={0}
        overflow="hidden"
        border={["left"]}
        borderColor={colors.barTrack}
      >
        <DetailPane view={view.pane} onAction={handlers.onAction} />
      </box>
    </box>
  );
}

/** One item's explanation with each of its places listed below. It is the only screen that isn't a plain list. */
function FindingDetailScreen({
  view,
  handlers,
}: {
  readonly view: FindingDetailView;
  readonly handlers: BodyHandlers;
}): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column" flexGrow={1} overflow="hidden" paddingLeft={1} paddingRight={1}>
      <DetailHeading view={view.pane} />
      <DetailSections view={view.pane} />
      <text flexShrink={0} fg={colors.muted}>
        {view.locationsHeading}
      </text>
      <ListRows view={view} handlers={handlers} />
    </box>
  );
}

export function BodyScreen({
  view,
  handlers,
}: {
  readonly view: BodyScreenView;
  readonly handlers: BodyHandlers;
}): ReactNode {
  switch (view.kind) {
    case ScreenKind.FindingDetail:
      return <FindingDetailScreen view={view} handlers={handlers} />;
    case ScreenKind.Diagnosis:
    case ScreenKind.Folders:
    case ScreenKind.DiskOverview:
    case ScreenKind.Growth:
      return <ListWithPane view={view} handlers={handlers} />;
  }
}
