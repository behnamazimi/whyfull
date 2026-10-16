import { UiCopy } from "../../copy/ui-copy.ts";
import { CleanupPhase, type AppState } from "../state/app-state.ts";
import { MinimumViewport, type Viewport } from "./layout.ts";

export interface WindowTooSmallView {
  readonly title: string;
  readonly howToFix: string;
  readonly quit: string | undefined;
}

export const fitsMinimumViewport = (viewport: Viewport): boolean =>
  viewport.columns >= MinimumViewport.columns && viewport.rows >= MinimumViewport.rows;

export function windowTooSmallView(
  state: AppState,
  viewport: Viewport,
): WindowTooSmallView | undefined {
  if (fitsMinimumViewport(viewport)) return undefined;
  const copy = UiCopy.windowTooSmall;
  return {
    title: copy.title,
    howToFix: copy.howToFix,
    quit: state.cleanup.phase === CleanupPhase.Running ? undefined : copy.quit,
  };
}
