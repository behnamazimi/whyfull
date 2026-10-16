import type { AbsolutePath } from "../path/absolute-path.ts";
import type { RuleId } from "../rules/rule-id.ts";
import type { DirectoryNode } from "../scan/directory-node.ts";
import { ByteSize } from "../size/byte-size.ts";

export const PromptEntryKind = {
  Folder: "folder",
  File: "file",
} as const;
export type PromptEntryKind = (typeof PromptEntryKind)[keyof typeof PromptEntryKind];

export interface PromptEntry {
  readonly name: string;
  readonly kind: PromptEntryKind;
  readonly size: ByteSize;
}

export interface AssistantPrompt {
  readonly systemDescription: string;
  readonly folder: AbsolutePath;
  readonly size: ByteSize;
  readonly fileCount: number;
  readonly lastModified: Date;
  readonly largestEntries: readonly PromptEntry[];
  readonly knownAs: RuleId | undefined;
}

export interface AssistantPromptSubject {
  readonly folder: DirectoryNode;
  readonly systemDescription: string;
  readonly knownAs: RuleId | undefined;
  readonly entryLimit: number;
}

export function assistantPromptFor(subject: AssistantPromptSubject): AssistantPrompt {
  const { folder } = subject;
  const entries: PromptEntry[] = [
    ...folder.children.map((child) => ({
      name: child.name,
      kind: PromptEntryKind.Folder,
      size: child.totalSize,
    })),
    ...folder.notableFiles.map((file) => ({
      name: file.path.name,
      kind: PromptEntryKind.File,
      size: file.size,
    })),
  ];
  return {
    systemDescription: subject.systemDescription,
    folder: folder.path,
    size: folder.totalSize,
    fileCount: folder.fileCount,
    lastModified: folder.lastModified,
    largestEntries: entries
      .sort((left, right) => ByteSize.largestFirst(left.size, right.size))
      .slice(0, subject.entryLimit),
    knownAs: subject.knownAs,
  };
}
