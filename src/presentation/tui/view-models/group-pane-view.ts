import { ByteSize } from "../../../domain/index.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { keyLabel, UserAction } from "../../keymap.ts";
import { groupTone, SelectionState } from "../../theme.ts";
import type { AppState } from "../state/app-state.ts";
import { cleanableItemsIn } from "../state/cleanup-target.ts";
import type { NavKind, NavItem } from "../state/navigation.ts";
import { plain, type DetailAction, type DetailView } from "./detail-view.ts";
import { selectionOf } from "./selection-of.ts";

const action = (forAction: UserAction, label: string, active = false): DetailAction => ({
  key: keyLabel[forAction],
  label,
  action: forAction,
  active,
});

function selectAllAction(state: AppState, group: Extract<NavItem, { kind: typeof NavKind.Group }>) {
  const items = cleanableItemsIn(group.findings);
  if (items.length === 0) return [];
  switch (selectionOf(items, state.cart)) {
    case SelectionState.All:
      return [action(UserAction.ToggleCleanup, UiCopy.groupPane.clearAll, true)];
    case SelectionState.Some:
      return [action(UserAction.ToggleCleanup, UiCopy.groupPane.addRest)];
    case SelectionState.None:
      return [action(UserAction.ToggleCleanup, UiCopy.groupPane.addAll)];
  }
}

/** What the pane says while the cursor is on a group's header: what the group is, and how to fold it. */
export function groupPaneView(
  state: AppState,
  group: Extract<NavItem, { kind: typeof NavKind.Group }>,
): DetailView {
  const copy = UiCopy.groups[group.group];
  return {
    title: copy.title,
    size: formatByteSize(ByteSize.sum(group.findings.map((finding) => finding.size))),
    tone: groupTone[group.group],
    verdict: copy.hint,
    meta: UiCopy.list.itemCount(group.findings.length),
    sections: [
      { label: UiCopy.detail.whatItIs, lines: [plain(UiCopy.groupPane.what[group.group])] },
    ],
    checks: [],
    notes: [],
    where: "",
    actions: [
      action(UserAction.Open, group.folded ? UiCopy.groupPane.show : UiCopy.groupPane.hide),
      ...selectAllAction(state, group),
    ],
  };
}
