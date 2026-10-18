import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { UiCopy } from "../../copy/ui-copy.ts";
import type { UserAction } from "../../keymap.ts";
import type { DetailView } from "../view-models/detail-view.ts";
import { useColors } from "./color-scheme-context.ts";

export function DetailSections({ view }: { readonly view: DetailView }): ReactNode {
  const colors = useColors();
  return (
    <>
      {view.sections.map((section) => (
        <box key={section.label} flexDirection="column" flexShrink={0} paddingBottom={1}>
          <text flexShrink={0} fg={colors.muted} attributes={TextAttributes.BOLD}>
            {section.label}
          </text>
          {section.lines.map((line) => (
            <text flexShrink={0} key={line.text} fg={colors[line.color]} wrapMode="word">
              {line.text}
            </text>
          ))}
        </box>
      ))}
      {view.checks.length === 0 ? null : (
        <box flexDirection="column" flexShrink={0} paddingBottom={1}>
          <text flexShrink={0} fg={colors.muted} attributes={TextAttributes.BOLD}>
            {UiCopy.detail.beforeYouStart}
          </text>
          {view.checks.map((check) => (
            <text flexShrink={0} key={check.text} fg={colors[check.color]} wrapMode="word">
              {`${check.mark} ${check.text}`}
            </text>
          ))}
        </box>
      )}
      {view.notes.map((line) => (
        <text flexShrink={0} key={line.text} fg={colors[line.color]} wrapMode="word">
          {line.text}
        </text>
      ))}
    </>
  );
}

export function DetailHeading({ view }: { readonly view: DetailView }): ReactNode {
  const colors = useColors();
  return (
    <>
      <box flexDirection="row" justifyContent="space-between" flexShrink={0}>
        <text fg={colors.text} attributes={TextAttributes.BOLD}>
          {view.title}
        </text>
        <text fg={colors.text}>{view.size}</text>
      </box>
      {view.verdict === "" ? null : (
        <text flexShrink={0} fg={colors[view.tone.color]} wrapMode="word">
          {`${view.tone.icon} ${view.verdict}`}
        </text>
      )}
      {view.meta === "" ? null : (
        <text flexShrink={0} fg={colors.muted}>
          {view.meta}
        </text>
      )}
      <text flexShrink={0}> </text>
    </>
  );
}

/** The pane beside a list: what the chosen row is, what happens if it goes, and what to do about it. */
export function DetailPane({
  view,
  onAction,
}: {
  readonly view: DetailView;
  readonly onAction: (action: UserAction) => void;
}): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column" flexGrow={1} overflow="hidden" paddingLeft={1} paddingRight={1}>
      <DetailHeading view={view} />
      <DetailSections view={view} />
      {view.where === "" ? null : (
        <text flexShrink={0} fg={colors.muted} wrapMode="char">
          {view.where}
        </text>
      )}
      <box flexGrow={1} />
      <box flexDirection="column" flexShrink={0}>
        {view.actions.map((item) => (
          <box
            key={item.label}
            flexShrink={0}
            onMouseDown={() => {
              onAction(item.action);
            }}
          >
            <text>
              <span
                fg={colors.text}
                bg={colors.selectionBackground}
                attributes={TextAttributes.BOLD}
              >
                {` ${item.key} `}
              </span>
              <span fg={item.active ? colors.safe : colors.text}>{` ${item.label}`}</span>
            </text>
          </box>
        ))}
      </box>
    </box>
  );
}
