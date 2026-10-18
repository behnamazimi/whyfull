export const UserAction = {
  MoveUp: "move-up",
  MoveDown: "move-down",
  PageUp: "page-up",
  PageDown: "page-down",
  Open: "open",
  Back: "back",
  ShowCleanup: "show-cleanup",
  BrowseFolders: "browse-folders",
  AskAssistant: "ask-assistant",
  ShowDiskOverview: "show-disk-overview",
  ScanWholeDisk: "scan-whole-disk",
  FixPermissions: "fix-permissions",
  RevealInFinder: "reveal-in-finder",
  Recheck: "recheck",
  ToggleCleanup: "toggle-cleanup",
  SelectAllSafe: "select-all-safe",
  ReviewCleanup: "review-cleanup",
  ConfirmCleanup: "confirm-cleanup",
  ShowGrowth: "show-growth",
  CopySummary: "copy-summary",
  HighRiskMode: "high-risk-mode",
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
  [UserAction.ShowCleanup]: ["1"],
  [UserAction.BrowseFolders]: ["2", "b"],
  [UserAction.AskAssistant]: ["a"],
  [UserAction.ShowDiskOverview]: ["3", "d"],
  [UserAction.ScanWholeDisk]: ["w"],
  [UserAction.FixPermissions]: ["f"],
  [UserAction.RevealInFinder]: ["o"],
  [UserAction.Recheck]: ["r"],
  [UserAction.ToggleCleanup]: ["space"],
  [UserAction.SelectAllSafe]: ["s"],
  [UserAction.ConfirmCleanup]: ["y"],
  [UserAction.ReviewCleanup]: ["c"],
  [UserAction.ShowGrowth]: ["4", "g"],
  [UserAction.CopySummary]: ["S"],
  [UserAction.HighRiskMode]: ["x"],
  [UserAction.Help]: ["m", "?"],
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

export const keyLabel: Readonly<Record<UserAction, string>> = {
  [UserAction.MoveUp]: "↑",
  [UserAction.MoveDown]: "↓",
  [UserAction.PageUp]: "pgup",
  [UserAction.PageDown]: "pgdn",
  [UserAction.Open]: "enter",
  [UserAction.Back]: "esc",
  [UserAction.ShowCleanup]: "1",
  [UserAction.BrowseFolders]: "2",
  [UserAction.AskAssistant]: "a",
  [UserAction.ShowDiskOverview]: "3",
  [UserAction.ScanWholeDisk]: "w",
  [UserAction.FixPermissions]: "f",
  [UserAction.RevealInFinder]: "o",
  [UserAction.Recheck]: "r",
  [UserAction.ToggleCleanup]: "space",
  [UserAction.SelectAllSafe]: "s",
  [UserAction.ConfirmCleanup]: "y",
  [UserAction.ReviewCleanup]: "c",
  [UserAction.ShowGrowth]: "4",
  [UserAction.CopySummary]: "S",
  [UserAction.HighRiskMode]: "x",
  [UserAction.Help]: "m",
  [UserAction.Quit]: "q",
};

/** Keys that still act while the person types a confirmation word. Letters are typed. */
export const TypingKey = {
  Submit: "submit",
  Erase: "erase",
  Cancel: "cancel",
} as const;
export type TypingKey = (typeof TypingKey)[keyof typeof TypingKey];

const typingKeymap: Readonly<Record<TypingKey, readonly string[]>> = {
  [TypingKey.Submit]: ["return", "enter"],
  [TypingKey.Erase]: ["backspace"],
  [TypingKey.Cancel]: ["escape"],
};

export const typingKeyFor = (keyName: string): TypingKey | undefined =>
  Object.values(TypingKey).find((typingKey) => typingKeymap[typingKey].includes(keyName));

/** Keys that act while a confirmation dialog is open. Everything else is ignored. */
export const DialogKey = {
  TurnOn: "turn-on",
  Cancel: "cancel",
} as const;
export type DialogKey = (typeof DialogKey)[keyof typeof DialogKey];

const dialogKeymap: Readonly<Record<DialogKey, readonly string[]>> = {
  [DialogKey.TurnOn]: ["return", "enter"],
  [DialogKey.Cancel]: ["escape", "x"],
};

export const dialogKeyFor = (keyName: string): DialogKey | undefined =>
  Object.values(DialogKey).find((dialogKey) => dialogKeymap[dialogKey].includes(keyName));

export const dialogKeyLabel: Readonly<Record<DialogKey, string>> = {
  [DialogKey.TurnOn]: "enter",
  [DialogKey.Cancel]: "esc",
};
