import { ColorRole, type Tone } from "../../theme.ts";
import type { UserAction } from "../../keymap.ts";

export interface DetailLine {
  readonly text: string;
  readonly color: ColorRole;
}

export interface DetailSection {
  readonly label: string;
  readonly lines: readonly DetailLine[];
}

/** A button at the foot of the pane. Pressing its key or clicking it does `action`. */
export interface DetailAction {
  readonly key: string;
  readonly label: string;
  readonly action: UserAction;
  /** Drawn in the "done" colour, for something already chosen. */
  readonly active: boolean;
}

/** What one row of any tab looks like in the pane beside the list. */
export interface DetailView {
  readonly title: string;
  readonly size: string;
  readonly tone: Tone;
  /** One line that says whether it is safe, in the tone's colour. */
  readonly verdict: string;
  readonly meta: string;
  readonly sections: readonly DetailSection[];
  /** Facts and cautions, in their own colours. */
  readonly notes: readonly DetailLine[];
  readonly where: string;
  readonly actions: readonly DetailAction[];
}

export const plain = (text: string): DetailLine => ({ text, color: ColorRole.text });
export const caution = (text: string): DetailLine => ({ text, color: ColorRole.caution });
export const muted = (text: string): DetailLine => ({ text, color: ColorRole.muted });
