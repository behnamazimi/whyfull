import { PromptEntryKind, type AbsolutePath, type AssistantPrompt } from "../../domain/index.ts";
import { formatAge } from "../format/age-format.ts";
import { formatByteSize } from "../format/byte-size-format.ts";
import { formatCount } from "../format/count-format.ts";
import { formatPath } from "../format/path-format.ts";
import { pluralize } from "../format/plural-format.ts";
import { ruleCopy } from "./rule-copy.ts";

export interface PromptRenderContext {
  readonly home: AbsolutePath;
  readonly now: Date;
}

const entryKindLabel: Readonly<Record<PromptEntryKind, string>> = {
  [PromptEntryKind.Folder]: "folder",
  [PromptEntryKind.File]: "file",
};

export function renderAssistantPrompt(
  prompt: AssistantPrompt,
  context: PromptRenderContext,
): string {
  const folder = formatPath(prompt.folder, context.home);
  const recognizedAs =
    prompt.knownAs === undefined
      ? []
      : [`A disk tool recognized it as: ${ruleCopy[prompt.knownAs].title}.`, ""];
  const entries = prompt.largestEntries.map(
    (entry) => `- ${entry.name} (${entryKindLabel[entry.kind]}, ${formatByteSize(entry.size)})`,
  );
  return [
    `I'm trying to free up space on my Mac. I'm using ${prompt.systemDescription}.`,
    `This folder uses a lot of space and I don't know what it is: ${folder}`,
    "",
    `- Size: ${formatByteSize(prompt.size)} in ${formatCount(prompt.fileCount)} ${pluralize(prompt.fileCount, "file", "files")}`,
    `- Last changed: ${formatAge(prompt.lastModified, context.now)}`,
    "",
    ...recognizedAs,
    "Largest items inside:",
    ...entries,
    "",
    "Please explain in plain language:",
    "1. Which app or tool most likely created this folder and what it is used for.",
    "2. Whether it is safe to remove, and what I would lose.",
    "3. The safest way to free this space (preferably with the app's own settings or command).",
    "",
    "If you're not sure about any of this, please say so.",
  ].join("\n");
}
