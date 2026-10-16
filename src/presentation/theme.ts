import { SafetyLevel } from "../domain/index.ts";

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
  folder: "▸",
  file: "·",
  separator: " · ",
  rule: "─",
  cursor: "▌",
  pointer: "›",
} as const;
