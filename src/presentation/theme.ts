import { FindingGroup, SafetyLevel } from "../domain/index.ts";

export const ColorRole = {
  text: "text",
  muted: "muted",
  accent: "accent",
  selectionBackground: "selectionBackground",
  safe: "safe",
  caution: "caution",
  keep: "keep",
  danger: "danger",
  unknown: "unknown",
  bar: "bar",
  barTrack: "barTrack",
  dialogBackground: "dialogBackground",
  /** Four steps of one neutral hue, for bars whose pieces have no safety verdict. */
  tintStrong: "tintStrong",
  tintMid: "tintMid",
  tintSoft: "tintSoft",
  tintFaint: "tintFaint",
} as const;
export type ColorRole = (typeof ColorRole)[keyof typeof ColorRole];

export const ThemeMode = {
  Dark: "dark",
  Light: "light",
} as const;
export type ThemeMode = (typeof ThemeMode)[keyof typeof ThemeMode];

export type ColorScheme = Readonly<Record<ColorRole, string>>;

export const colorSchemes: Readonly<Record<ThemeMode, ColorScheme>> = {
  [ThemeMode.Dark]: {
    text: "#E6E6E6",
    muted: "#8A8F98",
    accent: "#7AA2F7",
    selectionBackground: "#2A3350",
    safe: "#9ECE6A",
    caution: "#E0AF68",
    keep: "#BB9AF7",
    danger: "#F7768E",
    unknown: "#A9B1D6",
    bar: "#7AA2F7",
    barTrack: "#3B4261",
    dialogBackground: "#1F2335",
    tintStrong: "#C4CFDF",
    tintMid: "#8D9DB6",
    tintSoft: "#62758F",
    tintFaint: "#43546D",
  },
  [ThemeMode.Light]: {
    text: "#1F2328",
    muted: "#656D76",
    accent: "#0969DA",
    selectionBackground: "#DDE7F7",
    safe: "#1A7F37",
    caution: "#9A6700",
    keep: "#8250DF",
    danger: "#CF222E",
    unknown: "#5A5F8A",
    bar: "#0969DA",
    barTrack: "#C8D1DC",
    dialogBackground: "#F6F8FA",
    tintStrong: "#3B4657",
    tintMid: "#667489",
    tintSoft: "#98A4B6",
    tintFaint: "#C6CEDA",
  },
};

export interface Tone {
  readonly icon: string;
  readonly color: ColorRole;
}

export const safetyTone: Readonly<Record<SafetyLevel, Tone>> = {
  [SafetyLevel.Regenerable]: { icon: "●", color: ColorRole.safe },
  [SafetyLevel.SafeViaOwnerTool]: { icon: "●", color: ColorRole.safe },
  [SafetyLevel.NeedsReview]: { icon: "◆", color: ColorRole.caution },
  [SafetyLevel.Protected]: { icon: "■", color: ColorRole.keep },
};

export const unexplainedTone: Tone = { icon: "?", color: ColorRole.unknown };

export const groupTone: Readonly<Record<FindingGroup, Tone>> = {
  [FindingGroup.Safe]: safetyTone[SafetyLevel.Regenerable],
  [FindingGroup.Check]: safetyTone[SafetyLevel.NeedsReview],
  [FindingGroup.Unrecognized]: unexplainedTone,
  [FindingGroup.Keep]: safetyTone[SafetyLevel.Protected],
};

export const SelectionState = {
  None: "none",
  Some: "some",
  All: "all",
} as const;
export type SelectionState = (typeof SelectionState)[keyof typeof SelectionState];

export const checkboxGlyph: Readonly<Record<SelectionState, string>> = {
  [SelectionState.None]: "[ ]",
  [SelectionState.Some]: "[–]",
  [SelectionState.All]: "[✓]",
};

export const Glyph = {
  barFull: "█",
  barEmpty: "░",
  /** Space that whyfull did not look through. */
  hatch: "▒",
  /** Legend markers, unlike the bar's blocks so a legend is never read as a second bar. */
  swatch: "●",
  swatchHatch: "◌",
  swatchEmpty: "○",
  folder: "▸",
  file: "·",
  separator: " · ",
  rule: "─",
  cursor: "▌",
  pointer: "›",
  breadcrumb: " › ",
  more: "⋯",
  done: "✓",
  working: "…",
  spinner: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  problem: "!",
  /** Marks a tab that has something new to look at. */
  news: "•",
  warning: "⚠",
} as const;
