import type { UnexplainedFolderFinding } from "../../../domain/index.ts";
import { folderCopy } from "../../copy/folder-copy.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatAge } from "../../format/age-format.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { ColorRole, unexplainedTone, type Tone } from "../../theme.ts";
import type { AppState } from "../state/app-state.ts";
import { highRiskEntryAt } from "../state/cleanup-target.ts";
import { blockedNotice, highRiskBlockOf, warningLines } from "../state/high-risk-reducer.ts";
import type { DetailLine } from "./finding-detail-view.ts";

export const UnrecognizedDetailKind = {
  Unrecognized: "unrecognized-detail",
} as const;

/** The side pane for a folder whyfull doesn't recognize: plain facts and what the person can do. */
export interface UnrecognizedDetailView {
  readonly kind: typeof UnrecognizedDetailKind.Unrecognized;
  readonly title: string;
  readonly size: string;
  readonly tone: Tone;
  readonly tag: string;
  readonly lines: readonly DetailLine[];
}

const line = (text: string, color: ColorRole): DetailLine => ({ text, color });

function detailLines(
  state: AppState,
  finding: UnexplainedFolderFinding,
  now: Date,
): readonly DetailLine[] {
  const entry = highRiskEntryAt(state, finding.path, undefined);
  if (entry === undefined) return [line(UiCopy.highRisk.detail.inviteOff, ColorRole.accent)];
  const facts = line(
    UiCopy.highRisk.detail.facts(formatAge(entry.lastModified, now), entry.fileCount),
    ColorRole.text,
  );
  const warnings = warningLines(state, entry).map((text) => line(text, ColorRole.caution));
  const consequence = line(UiCopy.highRisk.detail.ifDeleted, ColorRole.text);
  const block = highRiskBlockOf(state, entry);
  const action =
    block !== undefined
      ? line(blockedNotice(block), ColorRole.muted)
      : state.cart.has(entry.path.toString())
        ? line(UiCopy.highRisk.detail.added, ColorRole.danger)
        : line(
            state.highRiskMode ? UiCopy.highRisk.detail.inviteOn : UiCopy.highRisk.detail.inviteOff,
            ColorRole.accent,
          );
  return [facts, ...warnings, consequence, action];
}

const SPACING = " ";

function explanationLines(
  state: AppState,
  finding: UnexplainedFolderFinding,
): readonly DetailLine[] {
  const known = state.context.knownFolders.find((folder) => folder.path.equals(finding.path));
  if (known === undefined) return [];
  const copy = folderCopy[known.id];
  return [
    line(UiCopy.detail.whatItIs, ColorRole.muted),
    line(copy.whatItIs, ColorRole.text),
    line(UiCopy.detail.ifRemoved, ColorRole.muted),
    line(copy.ifRemoved, ColorRole.text),
    line(SPACING, ColorRole.text),
  ];
}

export function unrecognizedDetailView(
  state: AppState,
  finding: UnexplainedFolderFinding,
  now: Date,
): UnrecognizedDetailView {
  return {
    kind: UnrecognizedDetailKind.Unrecognized,
    title: formatPath(finding.path, state.context.home),
    size: formatByteSize(finding.size),
    tone: unexplainedTone,
    tag: UiCopy.highRisk.detail.notRecognized,
    lines: [...explanationLines(state, finding), ...detailLines(state, finding, now)],
  };
}
