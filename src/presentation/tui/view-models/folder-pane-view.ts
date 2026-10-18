import { safeSizeInside, type Rule } from "../../../domain/index.ts";
import { folderCopy } from "../../copy/folder-copy.ts";
import { ruleCopy } from "../../copy/rule-copy.ts";
import { isCleanableByWhyfull, ruleStatus, whoCleansUp } from "../../copy/rule-labels.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatAge } from "../../format/age-format.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { keyLabel, UserAction } from "../../keymap.ts";
import { ColorRole, Glyph, safetyTone, type Tone } from "../../theme.ts";
import { ScanStatus, type AppState } from "../state/app-state.ts";
import { highRiskEntryAt } from "../state/cleanup-target.ts";
import { blockedNotice, highRiskBlockAt, highRiskBlockOf } from "../state/high-risk-reducer.ts";
import { FolderEntryKind, type FolderEntry } from "../state/selectors.ts";
import {
  muted,
  plain,
  type DetailAction,
  type DetailLine,
  type DetailSection,
  type DetailView,
} from "./detail-view.ts";

const action = (forAction: UserAction, label: string, active = false): DetailAction => ({
  key: keyLabel[forAction],
  label,
  action: forAction,
  active,
});

const neutralTone = (entry: FolderEntry): Tone => ({
  icon: entry.kind === FolderEntryKind.Folder ? Glyph.folder : Glyph.file,
  color: ColorRole.muted,
});

function sectionsFor(state: AppState, entry: FolderEntry): readonly DetailSection[] {
  if (entry.classification !== undefined) {
    const copy = ruleCopy[entry.classification.rule.id];
    return [
      { label: UiCopy.detail.whatItIs, lines: [plain(copy.whatItIs)] },
      { label: UiCopy.detail.ifRemoved, lines: [plain(copy.ifRemoved)] },
    ];
  }
  const known = state.context.knownFolders.find((folder) => folder.path.equals(entry.path));
  if (known === undefined) return [];
  const copy = folderCopy[known.id];
  return [
    { label: UiCopy.detail.whatItIs, lines: [plain(copy.whatItIs)] },
    { label: UiCopy.detail.ifRemoved, lines: [plain(copy.ifRemoved)] },
  ];
}

function verdictOf(state: AppState, entry: FolderEntry): string {
  if (entry.classification !== undefined) return ruleStatus(entry.classification.rule);
  const known = state.context.knownFolders.find((folder) => folder.path.equals(entry.path));
  if (known !== undefined) return folderCopy[known.id].label;
  return entry.kind === FolderEntryKind.File ? UiCopy.tree.fileTag : UiCopy.tree.folderTag;
}

function notesFor(state: AppState, entry: FolderEntry): readonly DetailLine[] {
  const { classification } = entry;
  if (classification !== undefined) return [plain(whoCleansUp(classification.rule))];
  const classifications =
    state.scan.status === ScanStatus.Completed
      ? state.scan.report.classification.classifications
      : [];
  const safe = safeSizeInside(classifications, entry.path);
  const block = highRiskBlockAt(state, entry.path);
  return [
    ...(safe.isZero() ? [] : [plain(UiCopy.tree.containsSafe(formatByteSize(safe)))]),
    muted(block === undefined ? UiCopy.highRisk.detail.inviteOff : blockedNotice(block)),
  ];
}

function toggleFor(state: AppState, entry: FolderEntry): DetailAction | undefined {
  const inCart = state.cart.has(entry.path.toString());
  const rule: Rule | undefined = entry.classification?.rule;
  if (rule !== undefined) {
    return isCleanableByWhyfull(rule)
      ? action(
          UserAction.ToggleCleanup,
          inCart ? UiCopy.detail.inCleanup : UiCopy.detail.add,
          inCart,
        )
      : undefined;
  }
  const risky = highRiskEntryAt(state, entry.path, undefined);
  if (!state.highRiskMode || risky === undefined || highRiskBlockOf(state, risky) !== undefined) {
    return undefined;
  }
  return action(
    UserAction.ToggleCleanup,
    inCart ? UiCopy.detail.inCleanupForGood : UiCopy.detail.addForGood,
    inCart,
  );
}

export function folderPaneView(state: AppState, entry: FolderEntry, now: Date): DetailView {
  const { classification } = entry;
  const toggle = toggleFor(state, entry);
  return {
    title: classification === undefined ? entry.path.name : ruleCopy[classification.rule.id].title,
    size: formatByteSize(entry.size),
    tone:
      classification === undefined ? neutralTone(entry) : safetyTone[classification.rule.safety],
    verdict: verdictOf(state, entry),
    meta: formatAge(entry.lastModified, now),
    sections: sectionsFor(state, entry),
    notes: notesFor(state, entry),
    where: formatPath(entry.path, state.context.home),
    actions: [
      ...(entry.kind === FolderEntryKind.Folder
        ? [action(UserAction.Open, UiCopy.detail.lookInside)]
        : []),
      action(UserAction.AskAssistant, UiCopy.detail.askAssistant),
      action(UserAction.RevealInFinder, UiCopy.actions[UserAction.RevealInFinder]),
      ...(toggle === undefined ? [] : [toggle]),
    ],
  };
}
