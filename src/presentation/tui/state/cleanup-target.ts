import {
  CartEntryKind,
  FindingKind,
  RemedyKind,
  SafetyLevel,
  type AbsolutePath,
  type Classification,
  type DirectoryNode,
  type Finding,
  type KnownItemFinding,
  type HighRiskEntry,
  type NotableFile,
  type Rule,
} from "../../../domain/index.ts";
import { isCleanableByWhyfull } from "../../copy/rule-labels.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import type { AppState } from "./app-state.ts";
import { ScreenKind } from "./screen.ts";
import { NavKind, navItemAt } from "./navigation.ts";
import { classificationAt, findingByIndex, folderAt, folderEntries } from "./selectors.ts";

export const CleanupTargetKind = {
  Nothing: "nothing",
  Recognized: "recognized",
  ManualOnly: "manual-only",
  HighRisk: "high-risk",
  NotScannedYet: "not-scanned-yet",
} as const;
export type CleanupTargetKind = (typeof CleanupTargetKind)[keyof typeof CleanupTargetKind];

/** What space would add to the cleanup on the current screen. */
export type CleanupTarget =
  | { readonly kind: typeof CleanupTargetKind.Nothing }
  | {
      readonly kind: typeof CleanupTargetKind.Recognized;
      readonly items: readonly Classification[];
    }
  | { readonly kind: typeof CleanupTargetKind.ManualOnly }
  | {
      readonly kind: typeof CleanupTargetKind.HighRisk;
      readonly entry: HighRiskEntry;
      /** Said when high-risk mode is off. */
      readonly invitation: string;
    }
  | { readonly kind: typeof CleanupTargetKind.NotScannedYet };

const nothing: CleanupTarget = { kind: CleanupTargetKind.Nothing };

/** A recognized item whyfull only explains may still be deleted in high-risk mode. */
const isHighRiskRule = (rule: Rule): boolean =>
  rule.safety !== SafetyLevel.Protected && rule.remedy.kind === RemedyKind.ExplainOnly;

const fromFolder = (folder: DirectoryNode, rule: Rule | undefined): HighRiskEntry => ({
  kind: CartEntryKind.HighRisk,
  path: folder.path,
  size: folder.totalSize,
  fileCount: folder.fileCount,
  personalFileCount: folder.personalFileCount,
  lastModified: folder.lastModified,
  scannedIdentity: folder.identity,
  rule,
});

const fromFile = (file: NotableFile, rule: Rule | undefined): HighRiskEntry => ({
  kind: CartEntryKind.HighRisk,
  path: file.path,
  size: file.size,
  fileCount: 1,
  personalFileCount: file.isPersonal ? 1 : 0,
  lastModified: file.lastModified,
  scannedIdentity: file.identity,
  rule,
});

export function highRiskEntryAt(
  state: AppState,
  path: AbsolutePath,
  rule: Rule | undefined,
): HighRiskEntry | undefined {
  const folder = folderAt(state, path);
  if (folder !== undefined) return fromFolder(folder, rule);
  const parent = path.parent === undefined ? undefined : folderAt(state, path.parent);
  const file = parent?.notableFiles.find((candidate) => candidate.path.equals(path));
  return file === undefined ? undefined : fromFile(file, rule);
}

function highRiskTarget(
  state: AppState,
  path: AbsolutePath,
  rule: Rule | undefined,
  invitation: string,
): CleanupTarget {
  const entry = highRiskEntryAt(state, path, rule);
  return entry === undefined
    ? { kind: CleanupTargetKind.NotScannedYet }
    : { kind: CleanupTargetKind.HighRisk, entry, invitation };
}

function recognizedTarget(state: AppState, items: readonly Classification[]): CleanupTarget {
  const [only, ...others] = items;
  if (only === undefined) return nothing;
  if (items.every((item) => isCleanableByWhyfull(item.rule))) {
    return { kind: CleanupTargetKind.Recognized, items };
  }
  return others.length === 0 && isHighRiskRule(only.rule)
    ? highRiskTarget(state, only.path, only.rule, UiCopy.highRisk.manualOnlyInvite)
    : { kind: CleanupTargetKind.ManualOnly };
}

/**
 * A group's header selects what in the group whyfull can clean, and nothing in a group it only
 * lists. It never reaches high-risk items: those are chosen one at a time.
 */
export const cleanableItemsIn = (findings: readonly Finding[]): readonly Classification[] =>
  findings
    .filter((finding): finding is KnownItemFinding => finding.kind === FindingKind.KnownItem)
    .flatMap((finding) => finding.locations)
    .filter((item) => isCleanableByWhyfull(item.rule));

function groupTarget(findings: readonly Finding[]): CleanupTarget {
  const items = cleanableItemsIn(findings);
  return items.length === 0 ? nothing : { kind: CleanupTargetKind.Recognized, items };
}

export function cleanupTargetOnScreen(state: AppState): CleanupTarget {
  const { screen } = state;
  switch (screen.kind) {
    case ScreenKind.Diagnosis: {
      const item = navItemAt(state, screen.selected);
      if (item === undefined) return nothing;
      if (item.kind === NavKind.Group) return groupTarget(item.findings);
      const { finding } = item;
      return finding.kind === FindingKind.KnownItem
        ? recognizedTarget(state, finding.locations)
        : highRiskTarget(state, finding.path, undefined, UiCopy.highRisk.invite);
    }
    case ScreenKind.FindingDetail: {
      const finding = findingByIndex(state, screen.findingIndex);
      const location =
        finding?.kind === FindingKind.KnownItem ? finding.locations[screen.selected] : undefined;
      return location === undefined ? nothing : recognizedTarget(state, [location]);
    }
    case ScreenKind.Folders: {
      const folder = folderAt(state, screen.folder);
      const entry =
        folder === undefined ? undefined : folderEntries(state, folder)[screen.selected];
      if (entry === undefined) return nothing;
      return entry.classification === undefined
        ? highRiskTarget(state, entry.path, undefined, UiCopy.highRisk.invite)
        : recognizedTarget(state, [entry.classification]);
    }
    case ScreenKind.Growth: {
      const grown = state.growth?.grownFolders[screen.selected];
      const classification = grown === undefined ? undefined : classificationAt(state, grown.path);
      return classification === undefined ? nothing : recognizedTarget(state, [classification]);
    }
    case ScreenKind.PromptPreview:
    case ScreenKind.Help:
    case ScreenKind.DiskOverview:
    case ScreenKind.PermissionGuide:
    case ScreenKind.CleanupReview:
    case ScreenKind.CleanupReport:
    case ScreenKind.HighRiskDialog:
      return nothing;
  }
}
