import { Category, RemedyKind, SafetyLevel, UsageShareKind } from "../../domain/index.ts";
import { UserAction } from "../keymap.ts";

export interface ShareCopyContext {
  readonly scannedFolder: string;
  readonly volumeNames: string;
  readonly wholeDisk: boolean;
}

export interface ShareCopy {
  readonly title: string;
  readonly detail: string;
}

export const UiCopy = {
  appName: "whyfull",
  diskLabel: "Your disk",
  diskUsage: (used: string, capacity: string, percent: string) =>
    `${used} of ${capacity} used (${percent})`,
  diskUsageUnknown: "Disk usage unavailable",
  scanRoot: (path: string) => `Looking in ${path}`,

  scanning: {
    title: "Looking through your files…",
    knownLocations: "Checking places that often fill up first…",
    progress: (folders: string, size: string) => `${folders} folders checked · ${size} found`,
    stillScanning: "Still looking. The list keeps improving while the scan runs.",
    nothingYet: "Nothing big found yet…",
    failed: (reason: string) => `The scan stopped unexpectedly: ${reason}`,
  },

  diagnosis: {
    title: "Here's where your space went",
    empty: "No big space users found here. Press b to browse folders yourself.",
    unexplainedSubtitle: "Not recognized yet. Press a to ask your AI assistant about it.",
    locations: (count: string) => `in ${count} places`,
    untouched: (size: string, months: string) => `${size} untouched for ${months}+ months`,
    issues: (count: string) =>
      `${count} folders couldn't be read. Grant Full Disk Access to see everything.`,
  },

  detail: {
    whatItIs: "What it is",
    ifRemoved: "If you remove it",
    howToFreeSpace: "How to free space",
    whereItIs: "Where it is",
  },

  tree: {
    title: "Browse folders",
    empty: "This folder is empty or couldn't be read.",
    fileTag: "file",
    smallFilesRow: (count: string) => `${count} smaller files`,
  },

  prompt: {
    title: "Ask your AI assistant",
    explanation:
      "This text will be copied to your clipboard. Nothing is sent anywhere. Paste it into ChatGPT, Claude or another assistant.",
  },

  notices: {
    copied: "Copied. Paste it into your AI assistant.",
    copyFailed: (reason: string) => `Couldn't copy to the clipboard: ${reason}`,
    waitForScan: "Available when the scan finishes.",
    nothingToAskAbout: "Select a folder first.",
    settingsOpened:
      "System Settings is open. Turn on your terminal app, quit and reopen it, then run whyfull again.",
    settingsFailed: (reason: string) => `Couldn't open System Settings: ${reason}`,
  },

  overview: {
    title: "Where your disk space is",
    shares: {
      [UsageShareKind.ScannedFolder]: (context: ShareCopyContext) => ({
        title: context.wholeDisk ? "Files whyfull looked through" : `In ${context.scannedFolder}`,
        detail: "Explained item by item on the main screen.",
      }),
      [UsageShareKind.ElsewhereOnDataVolume]: (context: ShareCopyContext) => ({
        title: "Elsewhere on your disk",
        detail: context.wholeDisk
          ? "Folders whyfull couldn't read, plus space held by snapshots."
          : "Apps, other accounts, system data and folders whyfull couldn't read. Press w to look at the whole disk.",
      }),
      [UsageShareKind.OperatingSystem]: () => ({
        title: "macOS itself",
        detail: "The system and its recovery tools. This space is needed.",
      }),
      [UsageShareKind.VirtualMemory]: () => ({
        title: "Virtual memory",
        detail: "Space macOS uses when memory runs low. It shrinks after a restart.",
      }),
      [UsageShareKind.OtherVolumes]: (context: ShareCopyContext) => ({
        title: `Other volumes: ${context.volumeNames}`,
        detail: "Separate volumes that share this disk.",
      }),
    } satisfies Readonly<Record<UsageShareKind, (context: ShareCopyContext) => ShareCopy>>,
    free: { title: "Free", detail: "Space you can use right now." },
    snapshots: (count: string) =>
      `${count} Time Machine snapshots are stored on this Mac. They can hold space from deleted files; macOS removes them when it needs room.`,
    unreadable: "Some folders couldn't be read. Press f to let whyfull see everything.",
    loading: "Measuring your disk…",
    scanning: "The first row grows while the scan runs.",
  },

  permissionGuide: {
    title: "Let whyfull see everything",
    intro:
      "macOS protects some folders, like Mail and Messages. To measure them, your terminal app needs Full Disk Access. whyfull still only reads; it never changes anything.",
    steps: [
      "1. Press enter to open System Settings > Privacy & Security > Full Disk Access.",
      "2. Turn on the switch for your terminal app (Terminal, iTerm, Ghostty or similar).",
      "3. Quit and reopen the terminal, then run whyfull again.",
    ],
    alreadyGranted: "Full Disk Access is already on for this terminal.",
  },

  openSettingsAction: "open System Settings",

  unexplainedLabel: "unknown",

  categories: {
    [Category.DeveloperFiles]: "Developer files",
    [Category.ContainersAndVirtualMachines]: "Containers & virtual machines",
    [Category.AppCaches]: "App caches",
    [Category.Installers]: "Installers",
    [Category.Backups]: "Backups",
    [Category.PhotosAndMessages]: "Photos & messages",
    [Category.AiModels]: "AI models",
    [Category.Games]: "Games",
    [Category.Trash]: "Trash",
    [Category.Logs]: "Logs",
    [Category.SystemAndApps]: "System & apps",
  } satisfies Readonly<Record<Category, string>>,

  safety: {
    [SafetyLevel.Regenerable]: "safe to remove",
    [SafetyLevel.SafeViaOwnerTool]: "safe with its own clean-up",
    [SafetyLevel.NeedsReview]: "review first",
    [SafetyLevel.Protected]: "keep",
  } satisfies Readonly<Record<SafetyLevel, string>>,

  remedies: {
    [RemedyKind.DeleteRegenerable]: "Can be removed; it is recreated when needed.",
    [RemedyKind.MoveToTrash]: "Can be moved to the Trash after you review it.",
    [RemedyKind.RunOwnerTool]: "Cleaned with the tool that owns it.",
    [RemedyKind.ExplainOnly]: "Free this space yourself; see the steps above.",
  } satisfies Readonly<Record<RemedyKind, string>>,

  actions: {
    [UserAction.MoveUp]: "up",
    [UserAction.MoveDown]: "down",
    [UserAction.PageUp]: "page up",
    [UserAction.PageDown]: "page down",
    [UserAction.Open]: "open",
    [UserAction.Back]: "back",
    [UserAction.BrowseFolders]: "browse folders",
    [UserAction.AskAssistant]: "ask AI",
    [UserAction.ShowDiskOverview]: "disk overview",
    [UserAction.ScanWholeDisk]: "scan whole disk",
    [UserAction.FixPermissions]: "see everything",
    [UserAction.Help]: "help",
    [UserAction.Quit]: "quit",
  } satisfies Readonly<Record<UserAction, string>>,

  copyAction: "copy",

  help: {
    title: "How whyfull works",
    lines: [
      "whyfull looks through your files and explains what is using your disk.",
      "It only reads. Nothing is changed or deleted, and nothing is sent anywhere.",
      "Green items are safe to remove. Yellow ones need a look first. Red ones are yours to keep.",
      "Ask AI copies a description of a folder so you can ask any AI assistant about it.",
    ],
  },
} as const;
