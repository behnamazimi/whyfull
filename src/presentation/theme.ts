import { SafetyLevel } from "../domain/index.ts";

export const Palette = {
  text: "#E6E6E6",
  muted: "#8A8F98",
  accent: "#7AA2F7",
  selectionBackground: "#2A3350",
  safe: "#9ECE6A",
  caution: "#E0AF68",
  keep: "#F7768E",
  unknown: "#A9B1D6",
  bar: "#7AA2F7",
  barTrack: "#3B4261",
} as const;

export interface Tone {
  readonly icon: string;
  readonly color: string;
}

export const safetyTone: Readonly<Record<SafetyLevel, Tone>> = {
  [SafetyLevel.Regenerable]: { icon: "●", color: Palette.safe },
  [SafetyLevel.SafeViaOwnerTool]: { icon: "●", color: Palette.safe },
  [SafetyLevel.NeedsReview]: { icon: "◆", color: Palette.caution },
  [SafetyLevel.Protected]: { icon: "■", color: Palette.keep },
};

export const unexplainedTone: Tone = { icon: "?", color: Palette.unknown };

export const Glyph = {
  barFull: "█",
  barEmpty: "░",
  folder: "▸",
  file: "·",
  separator: " · ",
  marked: "✓",
  rule: "─",
} as const;
