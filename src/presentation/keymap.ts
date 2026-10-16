export const UserAction = {
  MoveUp: "move-up",
  MoveDown: "move-down",
  PageUp: "page-up",
  PageDown: "page-down",
  Open: "open",
  Back: "back",
  BrowseFolders: "browse-folders",
  AskAssistant: "ask-assistant",
  ShowDiskOverview: "show-disk-overview",
  ScanWholeDisk: "scan-whole-disk",
  FixPermissions: "fix-permissions",
  ToggleCleanup: "toggle-cleanup",
  ReviewCleanup: "review-cleanup",
  ShowGrowth: "show-growth",
  Help: "help",
  Quit: "quit",
} as const;
export type UserAction = (typeof UserAction)[keyof typeof UserAction];

export const keymap: Readonly<Record<UserAction, readonly string[]>> = {
  [UserAction.MoveUp]: ["up", "k"],
  [UserAction.MoveDown]: ["down", "j"],
  [UserAction.PageUp]: ["pageup"],
  [UserAction.PageDown]: ["pagedown"],
  [UserAction.Open]: ["return", "enter", "right", "l"],
  [UserAction.Back]: ["escape", "backspace", "left", "h"],
  [UserAction.BrowseFolders]: ["b"],
  [UserAction.AskAssistant]: ["a"],
  [UserAction.ShowDiskOverview]: ["d"],
  [UserAction.ScanWholeDisk]: ["w"],
  [UserAction.FixPermissions]: ["f"],
  [UserAction.ToggleCleanup]: ["space"],
  [UserAction.ReviewCleanup]: ["c"],
  [UserAction.ShowGrowth]: ["g"],
  [UserAction.Help]: ["?"],
  [UserAction.Quit]: ["q"],
};

const actionByKey: ReadonlyMap<string, UserAction> = new Map(
  Object.entries(keymap).flatMap(([action, keys]) =>
    keys.map((key): [string, UserAction] => [key, actionOf(action)]),
  ),
);

function actionOf(name: string): UserAction {
  const action = Object.values(UserAction).find((candidate) => candidate === name);
  if (action === undefined) throw new Error(`Unknown action ${name}`);
  return action;
}

export const actionForKey = (keyName: string): UserAction | undefined => actionByKey.get(keyName);

export const primaryKeyOf = (action: UserAction): string => keymap[action][0] ?? "";

export const keyLabel: Readonly<Record<UserAction, string>> = {
  [UserAction.MoveUp]: "↑",
  [UserAction.MoveDown]: "↓",
  [UserAction.PageUp]: "pgup",
  [UserAction.PageDown]: "pgdn",
  [UserAction.Open]: "enter",
  [UserAction.Back]: "esc",
  [UserAction.BrowseFolders]: "b",
  [UserAction.AskAssistant]: "a",
  [UserAction.ShowDiskOverview]: "d",
  [UserAction.ScanWholeDisk]: "w",
  [UserAction.FixPermissions]: "f",
  [UserAction.ToggleCleanup]: "space",
  [UserAction.ReviewCleanup]: "c",
  [UserAction.ShowGrowth]: "g",
  [UserAction.Help]: "?",
  [UserAction.Quit]: "q",
};
