import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { UiCopy } from "../../copy/ui-copy.ts";
import { keyLabel, UserAction } from "../../keymap.ts";
import type { FindingFilter } from "../state/finding-filter.ts";
import type { FilterChip } from "../view-models/body-view.ts";
import { useColors } from "./color-scheme-context.ts";

const CHIP_GAP = 1;

export function FilterChips({
  chips,
  onFilter,
}: {
  readonly chips: readonly FilterChip[];
  readonly onFilter: (filter: FindingFilter) => void;
}): ReactNode {
  const colors = useColors();
  const several = chips.length > 1;
  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      flexShrink={0}
      paddingLeft={1}
      paddingRight={1}
    >
      <box flexDirection="row" gap={CHIP_GAP}>
        {chips.map((chip) => (
          <box
            key={chip.label}
            onMouseDown={() => {
              if (chip.filter !== undefined) onFilter(chip.filter);
            }}
          >
            <text
              fg={chip.active ? colors.text : colors.muted}
              {...(chip.active
                ? { bg: colors.selectionBackground, attributes: TextAttributes.BOLD }
                : {})}
            >
              {` ${chip.label}${chip.size === "" ? "" : ` ${chip.size}`} `}
            </text>
          </box>
        ))}
      </box>
      {several ? (
        <text fg={colors.muted}>{UiCopy.list.filterHint(keyLabel[UserAction.CycleFilter])}</text>
      ) : null}
    </box>
  );
}
