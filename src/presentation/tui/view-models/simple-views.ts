import { UiCopy } from "../../copy/ui-copy.ts";
import { keyLabel, UserAction } from "../../keymap.ts";
import { ColorRole, safetyTone } from "../../theme.ts";
import { SafetyLevel } from "../../../domain/index.ts";
import { ScreenKind } from "../state/screen.ts";
import type { KeyHint } from "./footer-view.ts";

const KEY_COLUMN_WIDTH = 10;

const HelpGroupId = {
  Look: "look",
  Clean: "clean",
  More: "more",
  /** Shown on the row of its partner, such as ↑ ↓. */
  Folded: "folded",
} as const;
type HelpGroupId = (typeof HelpGroupId)[keyof typeof HelpGroupId];

const helpGroupOf: Readonly<Record<UserAction, HelpGroupId>> = {
  [UserAction.MoveUp]: HelpGroupId.Look,
  [UserAction.MoveDown]: HelpGroupId.Folded,
  [UserAction.PageUp]: HelpGroupId.Look,
  [UserAction.PageDown]: HelpGroupId.Folded,
  [UserAction.Open]: HelpGroupId.Look,
  [UserAction.Back]: HelpGroupId.Look,
  [UserAction.BrowseFolders]: HelpGroupId.Look,
  [UserAction.ShowDiskOverview]: HelpGroupId.Look,
  [UserAction.ShowGrowth]: HelpGroupId.Look,
  [UserAction.ToggleCleanup]: HelpGroupId.Clean,
  [UserAction.ReviewCleanup]: HelpGroupId.Clean,
  [UserAction.ConfirmCleanup]: HelpGroupId.Clean,
  [UserAction.HighRiskMode]: HelpGroupId.Clean,
  [UserAction.AskAssistant]: HelpGroupId.More,
  [UserAction.ScanWholeDisk]: HelpGroupId.More,
  [UserAction.FixPermissions]: HelpGroupId.More,
  [UserAction.Help]: HelpGroupId.More,
  [UserAction.Quit]: HelpGroupId.More,
};

const foldedPartner: Readonly<Partial<Record<UserAction, UserAction>>> = {
  [UserAction.MoveUp]: UserAction.MoveDown,
  [UserAction.PageUp]: UserAction.PageDown,
};

const helpKeyFor = (action: UserAction): string => {
  const partner = foldedPartner[action];
  return partner === undefined ? keyLabel[action] : `${keyLabel[action]} ${keyLabel[partner]}`;
};

const helpGroup = (id: Exclude<HelpGroupId, typeof HelpGroupId.Folded>): HelpGroup => ({
  heading: UiCopy.help.groups[id],
  keys: Object.values(UserAction)
    .filter((action) => helpGroupOf[action] === id)
    .map((action) => ({ key: helpKeyFor(action), label: UiCopy.actions[action] })),
});

export interface PromptPreviewView {
  readonly kind: typeof ScreenKind.PromptPreview;
  readonly title: string;
  readonly explanation: string;
  readonly lines: readonly string[];
}

export interface HelpView {
  readonly kind: typeof ScreenKind.Help;
  readonly title: string;
  readonly intro: readonly string[];
  readonly sections: readonly HelpSection[];
  readonly groups: readonly HelpGroup[];
  readonly keyColumnWidth: number;
}

export interface HelpSection {
  readonly heading: string;
  readonly rows: readonly HelpRow[];
}

/** One line of a help section: a colored marker and label, then plain text. */
export interface HelpRow {
  readonly marker: string;
  readonly label: string;
  readonly color: ColorRole;
  readonly text: string;
}

const markRow = (level: SafetyLevel, label: string, text: string): HelpRow => ({
  marker: safetyTone[level].icon,
  label,
  color: safetyTone[level].color,
  text,
});

const stepRow = (position: number, action: UserAction, text: string): HelpRow => ({
  marker: `${String(position)}.`,
  label: keyLabel[action],
  color: ColorRole.accent,
  text,
});

const FIRST_STEP = 1;
const SECOND_STEP = 2;
const THIRD_STEP = 3;

const helpSections = (): readonly HelpSection[] => [
  {
    heading: UiCopy.help.marksHeading,
    rows: [
      markRow(SafetyLevel.Regenerable, UiCopy.tags.safeToRemove, UiCopy.help.marks.safe),
      markRow(SafetyLevel.NeedsReview, UiCopy.tags.reviewThenTrash, UiCopy.help.marks.check),
      markRow(SafetyLevel.Protected, UiCopy.tags.keep, UiCopy.help.marks.keep),
    ],
  },
  {
    heading: UiCopy.help.stepsHeading,
    rows: [
      stepRow(FIRST_STEP, UserAction.ToggleCleanup, UiCopy.help.steps.select),
      stepRow(SECOND_STEP, UserAction.ReviewCleanup, UiCopy.help.steps.review),
      stepRow(THIRD_STEP, UserAction.ConfirmCleanup, UiCopy.help.steps.confirm),
    ],
  },
  {
    heading: UiCopy.help.highRiskHeading,
    rows: [
      {
        marker: UiCopy.highRisk.warningMark,
        label: keyLabel[UserAction.HighRiskMode],
        color: ColorRole.danger,
        text: UiCopy.help.highRisk,
      },
    ],
  },
];

export interface HelpGroup {
  readonly heading: string;
  readonly keys: readonly Pick<KeyHint, "key" | "label">[];
}

export const promptPreviewView = (text: string): PromptPreviewView => ({
  kind: ScreenKind.PromptPreview,
  title: UiCopy.prompt.title,
  explanation: UiCopy.prompt.explanation,
  lines: text.split("\n"),
});

export const helpView = (): HelpView => ({
  kind: ScreenKind.Help,
  title: UiCopy.help.title,
  intro: UiCopy.help.intro,
  sections: helpSections(),
  groups: [helpGroup(HelpGroupId.Look), helpGroup(HelpGroupId.Clean), helpGroup(HelpGroupId.More)],
  keyColumnWidth: KEY_COLUMN_WIDTH,
});

export interface PermissionGuideView {
  readonly kind: typeof ScreenKind.PermissionGuide;
  readonly title: string;
  readonly intro: string;
  readonly steps: readonly string[];
  readonly status: string | undefined;
}

export const permissionGuideView = (alreadyGranted: boolean): PermissionGuideView => ({
  kind: ScreenKind.PermissionGuide,
  title: UiCopy.permissionGuide.title,
  intro: UiCopy.permissionGuide.intro,
  steps: UiCopy.permissionGuide.steps,
  status: alreadyGranted ? UiCopy.permissionGuide.alreadyGranted : undefined,
});
