import {
  assistantPromptFor,
  ByteSize,
  FindingKind,
  isHighRiskAction,
  type AbsolutePath,
  type Classification,
  type DirectoryNode,
  type Finding,
} from "../../../domain/index.ts";
import { renderAssistantPrompt } from "../../copy/assistant-prompt-template.ts";
import { CleanupPhase, ScanStatus, type AppState } from "./app-state.ts";
import { NavKind, navItemAt } from "./navigation.ts";
import { ScreenKind } from "./screen.ts";

export const FolderEntryKind = {
  Folder: "folder",
  File: "file",
} as const;
export type FolderEntryKind = (typeof FolderEntryKind)[keyof typeof FolderEntryKind];

export interface FolderEntry {
  readonly kind: FolderEntryKind;
  readonly path: AbsolutePath;
  readonly size: ByteSize;
  readonly lastModified: Date;
  readonly classification: Classification | undefined;
}

/** The finding under the cursor on the main list, or nothing when the cursor is on a group's header. */
export function selectedFinding(state: AppState, navIndex: number): Finding | undefined {
  const item = navItemAt(state, navIndex);
  return item?.kind === NavKind.Finding ? item.finding : undefined;
}

/** A finding by its place in the scan's own list, which is what a detail screen keeps. */
export const findingByIndex = (state: AppState, index: number): Finding | undefined =>
  state.scan.findings[index];

export const locationPathsOf = (finding: Finding): readonly AbsolutePath[] =>
  finding.kind === FindingKind.KnownItem
    ? finding.locations.map((location) => location.path)
    : [finding.path];

export function folderAt(state: AppState, path: AbsolutePath): DirectoryNode | undefined {
  return state.scan.status === ScanStatus.Completed
    ? state.scan.report.snapshot.root.find(path)
    : undefined;
}

export function classificationAt(state: AppState, path: AbsolutePath): Classification | undefined {
  return state.scan.status === ScanStatus.Completed
    ? state.scan.classificationByPath.get(path.toString())
    : undefined;
}

export function folderEntries(state: AppState, folder: DirectoryNode): readonly FolderEntry[] {
  const entries: FolderEntry[] = [
    ...folder.children.map((child) => ({
      kind: FolderEntryKind.Folder,
      path: child.path,
      size: child.totalSize,
      lastModified: child.lastModified,
      classification: classificationAt(state, child.path),
    })),
    ...folder.notableFiles.map((file) => ({
      kind: FolderEntryKind.File,
      path: file.path,
      size: file.size,
      lastModified: file.lastModified,
      classification: classificationAt(state, file.path),
    })),
  ];
  return entries.sort((left, right) => ByteSize.largestFirst(left.size, right.size));
}

export function assistantPromptText(state: AppState, path: AbsolutePath): string | undefined {
  if (state.scan.status !== ScanStatus.Completed) return undefined;
  const containingFolder = path.parent === undefined ? undefined : folderAt(state, path.parent);
  const folder = folderAt(state, path) ?? containingFolder;
  if (folder === undefined) return undefined;
  const prompt = assistantPromptFor({
    folder,
    systemDescription: state.context.systemDescription,
    knownAs: classificationAt(state, folder.path)?.rule.id,
    entryLimit: state.context.scanPolicy.promptEntryLimit,
  });
  return renderAssistantPrompt(prompt, {
    home: state.context.home,
    now: state.scan.report.snapshot.finishedAt,
  });
}

/** On the review screen, a plan with high-risk items waits for the person to type a word. */
export const isTypingConfirmation = (state: AppState): boolean =>
  state.screen.kind === ScreenKind.CleanupReview &&
  state.cleanup.phase === CleanupPhase.Reviewing &&
  state.cleanup.plan.actions.some(isHighRiskAction);
