import { assertNever, RemedyKind, runningOwnerApp, type Rule } from "../../../domain/index.ts";
import { isCleanableByWhyfull } from "../../copy/rule-labels.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { ColorRole, Glyph } from "../../theme.ts";
import type { AppState } from "../state/app-state.ts";
import type { DetailCheck } from "./detail-view.ts";

const done = (text: string): DetailCheck => ({ mark: Glyph.done, color: ColorRole.safe, text });

/**
 * What stands between a person and cleaning this item. An app tool isn't claimed to be ready:
 * whyfull only checks it when the cleanup is reviewed (ADR 0013).
 */
export function ruleChecks(state: AppState, rule: Rule): readonly DetailCheck[] {
  if (!isCleanableByWhyfull(rule)) return [];
  const app = runningOwnerApp([rule], state.runningApps);
  const appCheck: readonly DetailCheck[] =
    app === undefined
      ? []
      : [{ mark: Glyph.blocked, color: ColorRole.caution, text: UiCopy.detail.appOpen(app) }];
  const { remedy } = rule;
  switch (remedy.kind) {
    case RemedyKind.DeleteRegenerable:
      return [...appCheck, done(UiCopy.checks.deletes)];
    case RemedyKind.EmptyTrash:
      return [...appCheck, done(UiCopy.checks.emptiesTrash)];
    case RemedyKind.MoveToTrash:
      return [...appCheck, done(UiCopy.checks.toTrash)];
    case RemedyKind.RunOwnerTool:
      return [
        ...appCheck,
        {
          mark: Glyph.step,
          color: ColorRole.muted,
          text: UiCopy.checks.toolOnReview(UiCopy.ownerToolNames[remedy.tool]),
        },
      ];
    case RemedyKind.ExplainOnly:
      return appCheck;
    default:
      return assertNever(remedy);
  }
}
