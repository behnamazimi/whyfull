import { totalSizeOf } from "../../../domain/index.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatCount } from "../../format/count-format.ts";
import { keyLabel, UserAction } from "../../keymap.ts";
import { ColorRole, Glyph } from "../../theme.ts";
import { ScanStatus, type AppState } from "../state/app-state.ts";
import { ScreenKind } from "../state/screen.ts";
import type { Viewport } from "./layout.ts";

export interface CartBarPart {
  readonly text: string;
  /** Drawn as a key cap. */
  readonly isKey: boolean;
}

export interface CartBarView {
  readonly rule: string;
  /** What is picked so far, when anything is. */
  readonly summary: string | undefined;
  readonly parts: readonly CartBarPart[];
  readonly color: ColorRole;
}

const words = (text: string): CartBarPart => ({ text, isKey: false });
const keyCap = (text: string): CartBarPart => ({ text, isKey: true });

function barFor(state: AppState, rule: string): CartBarView | undefined {
  const entries = [...state.cart.values()];
  const summary =
    entries.length === 0
      ? undefined
      : UiCopy.cartBar.picked(formatCount(entries.length), formatByteSize(totalSizeOf(entries)));
  const pick = [
    words(UiCopy.cartBar.pressBefore),
    keyCap(keyLabel[UserAction.ToggleCleanup]),
    words(UiCopy.cartBar.pickAfter),
  ];
  switch (state.scan.status) {
    case ScanStatus.Running:
      return {
        rule,
        summary,
        color: summary === undefined ? ColorRole.muted : ColorRole.caution,
        parts:
          summary === undefined
            ? [...pick, words(UiCopy.cartBar.unlocksAfterScan)]
            : [words(UiCopy.cartBar.unlocksAfterScan)],
      };
    case ScanStatus.Completed:
      return summary === undefined
        ? { rule, summary, color: ColorRole.muted, parts: pick }
        : {
            rule,
            summary,
            color: ColorRole.safe,
            parts: [keyCap(keyLabel[UserAction.ReviewCleanup]), words(UiCopy.cartBar.review)],
          };
    case ScanStatus.Failed:
      return undefined;
  }
}

/** The strip above the footer that keeps the cleanup cart in view while the person picks. */
export function cartBarView(state: AppState, viewport: Viewport): CartBarView | undefined {
  switch (state.screen.kind) {
    case ScreenKind.Diagnosis:
    case ScreenKind.FindingDetail:
    case ScreenKind.Folders:
      return barFor(state, Glyph.rule.repeat(Math.max(0, viewport.columns)));
    case ScreenKind.PromptPreview:
    case ScreenKind.Help:
    case ScreenKind.DiskOverview:
    case ScreenKind.PermissionGuide:
    case ScreenKind.CleanupReview:
    case ScreenKind.CleanupReport:
    case ScreenKind.Growth:
    case ScreenKind.HighRiskDialog:
      return undefined;
  }
}
