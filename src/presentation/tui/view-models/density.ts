import { Layout } from "./layout.ts";

/** How much of the frame's summary fits. Tall windows show everything; short ones keep the essentials. */
export const Density = {
  Roomy: "roomy",
  Snug: "snug",
  Compact: "compact",
} as const;
export type Density = (typeof Density)[keyof typeof Density];

const ROOMY_MINIMUM_ROWS = 32;
const SNUG_MINIMUM_ROWS = 24;

export const densityFor = (rows: number): Density => {
  if (rows >= ROOMY_MINIMUM_ROWS) return Density.Roomy;
  if (rows >= SNUG_MINIMUM_ROWS) return Density.Snug;
  return Density.Compact;
};

/** Lines each part of the frame takes, so the screen is given exactly what is left. */
export interface FrameLines {
  /** The tab line, and the rule under it unless the window is short. */
  readonly tabs: number;
  /** Headline, bar, then the legend, the note and a rule as the window allows. */
  readonly summary: number;
  /** The selection line, and the rule above it unless the window is short. */
  readonly actionBar: number;
  readonly keys: number;
}

const HEADLINE_AND_BAR = 2;
const LEGEND = 1;
const NOTE = 1;
const RULE = 1;
const ONE_LINE = 1;

const linesByDensity: Readonly<Record<Density, FrameLines>> = {
  [Density.Roomy]: {
    tabs: ONE_LINE + RULE,
    summary: HEADLINE_AND_BAR + LEGEND + NOTE + RULE,
    actionBar: RULE + ONE_LINE,
    keys: ONE_LINE,
  },
  [Density.Snug]: {
    tabs: ONE_LINE + RULE,
    summary: HEADLINE_AND_BAR + LEGEND + RULE,
    actionBar: RULE + ONE_LINE,
    keys: ONE_LINE,
  },
  [Density.Compact]: {
    tabs: ONE_LINE,
    summary: HEADLINE_AND_BAR,
    actionBar: ONE_LINE,
    keys: ONE_LINE,
  },
};

export const frameLinesFor = (density: Density): FrameLines => linesByDensity[density];

export const totalFrameLines = (density: Density): number => {
  const lines = frameLinesFor(density);
  return lines.tabs + lines.summary + lines.actionBar + lines.keys;
};

export const hasLegend = (density: Density): boolean => density !== Density.Compact;
export const hasNote = (density: Density): boolean => density === Density.Roomy;
export const hasRules = (density: Density): boolean => density !== Density.Compact;

/** Keeps `Layout` imported where `density` pulls in widths. */
export const summaryBarWidth = (columns: number): number =>
  Math.max(1, Math.min(columns - Layout.horizontalPadding, Layout.summaryBarMaximumWidth));
