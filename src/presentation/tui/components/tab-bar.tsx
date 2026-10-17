import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { UiCopy } from "../../copy/ui-copy.ts";
import type { UserAction } from "../../keymap.ts";
import type { TabsView } from "../view-models/tabs-view.ts";
import { useColors } from "./color-scheme-context.ts";

const TAB_GAP = 1;
const SECTION_GAP = 2;

export function TabBar({
  view,
  onAction,
}: {
  readonly view: TabsView;
  readonly onAction: (action: UserAction) => void;
}): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column" flexShrink={0}>
      <box flexDirection="row" justifyContent="space-between" paddingLeft={1} paddingRight={1}>
        <box flexDirection="row" gap={SECTION_GAP}>
          <text fg={colors.accent} attributes={TextAttributes.BOLD}>
            {UiCopy.appName}
          </text>
          <box flexDirection="row" gap={TAB_GAP}>
            {view.tabs.map((tab) => (
              <box
                key={tab.tab}
                onMouseDown={() => {
                  onAction(tab.action);
                }}
              >
                <text
                  fg={tab.active ? colors.text : colors.muted}
                  {...(tab.active
                    ? { bg: colors.selectionBackground, attributes: TextAttributes.BOLD }
                    : {})}
                >
                  {` ${tab.key} ${tab.label}${tab.badge === "" ? "" : ` ${tab.badge}`} `}
                </text>
              </box>
            ))}
          </box>
        </box>
        <text>
          {view.highRisk === undefined ? null : (
            <span fg={colors.danger} attributes={TextAttributes.BOLD}>
              {view.highRisk}
              {"  "}
            </span>
          )}
          <span fg={colors.muted}>{view.scope}</span>
        </text>
      </box>
      {view.rule === undefined ? null : <text fg={colors.barTrack}>{view.rule}</text>}
    </box>
  );
}
