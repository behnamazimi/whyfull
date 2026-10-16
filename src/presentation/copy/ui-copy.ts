import {
  BlockReason,
  ChangeDirection,
  Category,
  CleanupActionKind,
  OutcomeKind,
  OwnerToolId,
  UsageShareKind,
} from "../../domain/index.ts";
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
  scanRoot: (path: string) => `Looking in ${path}`,

  header: {
    diskLabel: "Disk",
    scanLabel: "Scan",
    diskSummary: (percent: string, free: string, capacity: string) =>
      `${percent} full · ${free} free of ${capacity}`,
    diskUnknown: "Measuring your disk…",
  },

  windowTooSmall: {
    title: "Make this window bigger to use whyfull",
    howToFix: "Drag a corner of the window.",
    quit: "Press q to quit.",
  },

  scanning: {
    knownLocations: "Checking places that often fill up…",
    starting: "Looking through your files…",
    progress: (folders: string, size: string) =>
      `Looking through your files… ${folders} folders checked · ${size} found`,
    done: (size: string, files: string) => `Done · ${size} in ${files} files`,
    nothingYet: "Nothing big found yet. Results appear here as the scan finds them.",
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
    ifRemoved: "If removed",
    cleaningUp: "Cleaning up",
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

  growth: {
    title: "What grew since your last scan",
    sinceLastScan: (age: string, change: string) => `Since your last scan (${age}): ${change}`,
    changes: {
      [ChangeDirection.Grew]: (size: string) => `+${size}`,
      [ChangeDirection.Shrank]: (size: string) => `−${size}`,
      [ChangeDirection.Unchanged]: () => "no change",
    } satisfies Readonly<Record<ChangeDirection, (size: string) => string>>,
    noneGrew: (size: string) => `No folder grew by more than ${size}.`,
    firstScan: "This is the first scan of this folder. Next time whyfull shows what grew.",
    was: (size: string) => `was ${size}`,
  },

  cleanup: {
    reviewTitle: "Review cleanup",
    planning: "Checking each item before anything is changed…",
    emptyCart: "Nothing selected yet. Press space on an item to add it to the cleanup.",
    manualOnly: "whyfull can't remove this for you. Open it to see how to free the space.",
    onlyKnownItems:
      "Only recognized items can be cleaned. Press a to ask your AI assistant about this folder.",
    actions: {
      [CleanupActionKind.Delete]: "Remove · recreated when needed",
      [CleanupActionKind.MoveToTrash]: "Move to the Trash",
      [CleanupActionKind.RunOwnerTool]: "Run its own clean-up",
    } satisfies Readonly<Record<CleanupActionKind, string>>,
    tools: {
      [OwnerToolId.DockerPrune]: "Docker clean-up (docker system prune)",
      [OwnerToolId.HomebrewCleanup]: "Homebrew clean-up (brew cleanup)",
      [OwnerToolId.SimulatorCleanup]: "Remove outdated simulators (xcrun simctl)",
      [OwnerToolId.NpmCacheClean]: "npm cache clean",
      [OwnerToolId.PnpmStorePrune]: "pnpm store prune",
      [OwnerToolId.BunCacheClean]: "Bun cache clean",
    } satisfies Readonly<Record<OwnerToolId, string>>,
    andMore: (count: string) => ` and ${count} more`,
    hiddenRows: (count: string) => `… and ${count} more items. They are all included.`,
    willFree: (size: string) => `About ${size} will be removed.`,
    toolsMayFree: (size: string) =>
      `Clean-up commands may free up to ${size} more; they decide themselves what is safe to remove.`,
    willTrash: (size: string) =>
      `${size} goes to the Trash. Empty the Trash afterwards to free that space.`,
    estimateNote:
      "Clean-up commands decide themselves what to remove, so their sizes are estimates.",
    notIncluded: "Not included",
    blockReasons: {
      [BlockReason.ManualOnly]: "free this space yourself; open it for steps",
      [BlockReason.Protected]: "protected; whyfull never removes this",
      [BlockReason.OutsideScanRoot]: "outside the folder that was scanned",
      [BlockReason.ChangedSinceScan]: "changed since the scan; scan again first",
      [BlockReason.AppRunning]: "its app is open; quit it first",
      [BlockReason.ToolMissing]: "its clean-up tool isn't installed",
    } satisfies Readonly<Record<BlockReason, string>>,
    nothingToDo: "Nothing selected can be cleaned automatically.",
    confirmAction: "clean up now",
    cancelAction: "cancel",
    running: (done: string, total: string) => `Cleaning… ${done} of ${total} done`,
    reportTitle: "Cleanup finished",
    measuredGain: (size: string) => `Your disk now has ${size} more free space.`,
    removed: (size: string) => `Removed about ${size}.`,
    trashed: (size: string) => `Moved ${size} to the Trash. Empty the Trash to free that space.`,
    problems: "Some items were not cleaned:",
    outcomes: {
      [OutcomeKind.Done]: "done",
      [OutcomeKind.Failed]: "failed",
      [OutcomeKind.SkippedBecauseChanged]: "changed since review, left alone",
    } satisfies Readonly<Record<OutcomeKind, string>>,
    scanAgainAction: "scan again",
    cartSummary: (count: string, size: string) => `review cleanup (${count} · ${size})`,
  },

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

  tags: {
    safeToRemove: "Safe",
    safeWithTool: "Safe",
    reviewThenTrash: "Check",
    reviewYourself: "Check",
    keep: "Yours",
  },

  ownerToolNames: {
    [OwnerToolId.DockerPrune]: "Docker's own clean-up",
    [OwnerToolId.HomebrewCleanup]: "Homebrew's own clean-up",
    [OwnerToolId.SimulatorCleanup]: "Xcode's own simulator clean-up",
    [OwnerToolId.NpmCacheClean]: "npm's own cache clean-up",
    [OwnerToolId.PnpmStorePrune]: "pnpm's own store clean-up",
    [OwnerToolId.BunCacheClean]: "Bun's own cache clean-up",
  } satisfies Readonly<Record<OwnerToolId, string>>,

  whoCleansUp: {
    remove: "whyfull can remove this for you.",
    trash: "whyfull can move this to the Trash for you. You can put it back from there.",
    tool: (toolName: string) => `whyfull can clean this for you with ${toolName}.`,
    yourself: "whyfull won't change this. You free the space yourself:",
    protected: "whyfull never changes this. Manage it in its app:",
  },

  addToCleanup: {
    one: "Press space to add it to your cleanup. Nothing changes until you review it with c.",
    several:
      "Select a place below and press space to add it to your cleanup. Nothing changes until you review it with c.",
    added: "✓ In your cleanup. Press c to review it, or space to take it out.",
  },

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
    [UserAction.ToggleCleanup]: "select",
    [UserAction.ReviewCleanup]: "review cleanup",
    [UserAction.ShowGrowth]: "what grew",
    [UserAction.Help]: "help",
    [UserAction.Quit]: "quit",
  } satisfies Readonly<Record<UserAction, string>>,

  copyAction: "copy",

  help: {
    title: "How whyfull works",
    lines: [
      "whyfull looks through your files and explains what is using your disk.",
      "It only reads. Nothing is changed or deleted, and nothing is sent anywhere.",
      "Green items are safe, and whyfull can clean them for you. Yellow ones need a look first. Red ones are yours to manage.",
      "Nothing is changed until you add items with space and confirm them on the review screen (c).",
      "Ask AI copies a description of a folder so you can ask any AI assistant about it.",
    ],
  },
} as const;
