import {
  BlockReason,
  ChangeDirection,
  Category,
  CleanupActionKind,
  FindingGroup,
  HighRiskWarning,
  OutcomeKind,
  OwnerToolId,
  UsageShareKind,
  type HighRiskBlockReason,
} from "../../domain/index.ts";
import { formatCount } from "../format/count-format.ts";
import { pluralize } from "../format/plural-format.ts";
import { DialogKey, keyLabel, UserAction } from "../keymap.ts";
import { FindingFilter } from "../tui/state/finding-filter.ts";

const key = (action: UserAction): string => `"${keyLabel[action]}"`;
const CONFIRMATION_WORD = "delete";
const QUIT_APP_ADVICE = "quit it first (Cmd+Q, not just the window)";

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
  scannedRoot: (path: string) => `Results for ${path}`,

  header: {
    diskLabel: "Disk",
    scanLabel: "Scan",
    diskSummary: (percent: string, free: string, capacity: string) =>
      `${percent} full · ${free} free of ${capacity}`,
    diskUnknown: "Measuring your disk…",
    cleanupSelected: (size: string) => `Cleanup: ${size} selected`,
  },

  windowTooSmall: {
    title: "Make this window bigger to use whyfull",
    howToFix: "Drag a corner of the window, or make your terminal full screen.",
    quit: `Press ${key(UserAction.Quit)} to quit.`,
  },

  scanning: {
    knownLocations: "Checking places that often fill up…",
    starting: "Looking through your files…",
    progress: (folders: number, size: string) =>
      `Looking through your files… ${formatCount(folders)} ${pluralize(folders, "folder", "folders")} checked · ${size} found`,
    scannedFolder: (path: string, size: string, disk: string) =>
      `Scanned ${path}: ${size} of your ${disk} disk.`,
    scannedFolderOnly: (path: string, size: string) => `Scanned ${path}: ${size}.`,
    scannedWholeDisk: (size: string) => `Scanned the whole disk: ${size}.`,
    lookAtWholeDisk: (key: string) => ` Press "${key}" to look at the whole disk.`,
    nothingYet: "Nothing big found yet. Results appear here as the scan finds them.",
    failed: (reason: string) => `The scan stopped unexpectedly (${reason}). Try scanning again.`,
  },

  diagnosis: {
    title: "Here's where your space went",
    empty: `No big space users found here. Press ${key(UserAction.BrowseFolders)} to browse folders yourself.`,
    emptyWithFolders: "Nothing whyfull recognizes here. These are the biggest folders:",
    emptyBrowse: `Press ${key(UserAction.BrowseFolders)} to browse them, or ${key(UserAction.ScanWholeDisk)} to look at the whole disk.`,
    noDetail: "Nothing selected.",
    nothingInFilter: `Nothing in this group. Press ${key(UserAction.CycleFilter)} to see another.`,
    reclaimable: (size: string) => `${size} can be cleared safely`,
    locations: (count: number) => `in ${formatCount(count)} ${pluralize(count, "place", "places")}`,
    untouched: (size: string, months: string) => `${size} untouched for ${months}+ months`,
    issues: (count: number) =>
      `${formatCount(count)} ${pluralize(count, "folder couldn't", "folders couldn't")} be read. Grant Full Disk Access to see everything.`,
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
    containsSafe: (size: string) => `contains ${size} safe to clean`,
    smallFilesRow: (count: string) => `${count} smaller files`,
  },

  prompt: {
    title: "Ask your AI assistant",
    explanation:
      "This text will be copied to your clipboard. It includes the folder's path and the names of its largest items. Nothing is sent until you paste it into ChatGPT, Claude or another assistant.",
  },

  notices: {
    historySetAside:
      "Your saved history came from a different version of whyfull, so a new one was started. The old file is kept next to it.",
    copied: "Copied. Paste it into your AI assistant.",
    copyFailed: (reason: string) => `Couldn't copy to the clipboard (${reason}). Try again.`,
    waitForScan: "You can do this once the scan finishes.",
    quitHint: `This is the first screen. Press ${key(UserAction.Quit)} to quit.`,
    nothingToAskAbout: "Select a folder first.",
    settingsOpened:
      "System Settings is open. Turn on your terminal app, quit and reopen it, then run whyfull again.",
    settingsFailed: (reason: string) =>
      `Couldn't open System Settings (${reason}). Open it yourself, then go to Privacy & Security > Full Disk Access.`,
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
          : `Apps, other accounts, system data and folders whyfull couldn't read. Press ${key(UserAction.ScanWholeDisk)} to look at the whole disk.`,
      }),
      [UsageShareKind.OperatingSystem]: () => ({
        title: "macOS itself",
        detail: "The system and its recovery tools. This space is needed.",
      }),
      [UsageShareKind.VirtualMemory]: () => ({
        title: "Memory and sleep files",
        detail: "Space macOS uses when memory runs low. It shrinks after a restart.",
      }),
      [UsageShareKind.OtherVolumes]: (context: ShareCopyContext) => ({
        title: `Other volumes: ${context.volumeNames}`,
        detail: "Separate volumes that share this disk.",
      }),
    } satisfies Readonly<Record<UsageShareKind, (context: ShareCopyContext) => ShareCopy>>,
    free: { title: "Free", detail: "Space you can use right now." },
    snapshots: (count: number) =>
      pluralize(
        count,
        "1 Time Machine snapshot is stored on this Mac. It can hold space from deleted files; macOS removes it when it needs room.",
        `${formatCount(count)} Time Machine snapshots are stored on this Mac. They can hold space from deleted files; macOS removes them when it needs room.`,
      ),
    unreadable: `Some folders couldn't be read. Press ${key(UserAction.FixPermissions)} to let whyfull see everything.`,
    loading: "Measuring your disk…",
    scanning: "The first row grows while the scan runs.",
  },

  permissionGuide: {
    title: "Let whyfull see everything",
    intro:
      "macOS protects some folders, like Mail and Messages. To measure them, your terminal app needs Full Disk Access. Measuring only reads: nothing changes unless you review and confirm a cleanup.",
    steps: [
      `1. Press ${key(UserAction.Open)} to open System Settings > Privacy & Security > Full Disk Access.`,
      "2. In System Settings, turn on the switch for your terminal app (Terminal, iTerm, Ghostty or similar).",
      "3. Quit and reopen your terminal yourself, then run whyfull again.",
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
    noneGrew: (size: string) =>
      `No folder grew by more than ${size}, so there is nothing to show. Smaller changes are not listed.`,
    firstScan: "This is the first scan of this folder. Next time whyfull shows what grew.",
    was: (size: string) => `was ${size}`,
  },

  cleanup: {
    reviewTitle: "Review cleanup",
    planning: "Checking each item before anything is changed…",
    emptyCart: `Nothing selected yet. Press ${key(UserAction.ToggleCleanup)} on an item to add it to the cleanup.`,
    manualOnly: "whyfull can't remove this for you. Open it to see how to free the space.",
    sections: {
      [CleanupActionKind.Delete]: { title: "Delete", hint: "it comes back when needed" },
      [CleanupActionKind.DeleteHighRisk]: {
        title: "Delete for good",
        hint: "only if you're sure; whyfull doesn't know what these are",
      },
      [CleanupActionKind.MoveToTrash]: {
        title: "Move to the Trash",
        hint: "you can put it back until you empty it",
      },
      [CleanupActionKind.RunOwnerTool]: {
        title: "Clean with its own tool",
        hint: "the tool decides what is removed",
      },
    } satisfies Readonly<Record<CleanupActionKind, { title: string; hint: string }>>,
    highRiskItems: "Items you chose",
    leftOut: { title: "Left out", hint: "can't be cleaned right now" },
    aside: (kinds: number, leftOut: number) =>
      `${formatCount(kinds)} ${pluralize(kinds, "kind", "kinds")} of item · ${formatCount(leftOut)} left out`,
    toFree: (size: string) => `${size} to free`,
    tools: {
      [OwnerToolId.DockerPrune]: "Docker's own cleanup (docker system prune)",
      [OwnerToolId.SimulatorCleanup]: "Xcode's own simulator cleanup (xcrun simctl)",
    } satisfies Readonly<Record<OwnerToolId, string>>,
    andMore: (count: string) => ` and ${count} more`,
    groupPlaces: (count: string) => ` · ${count} places`,
    morePlaces: (count: string) => `and ${count} more`,
    hiddenGroups: (count: number) =>
      `… and ${formatCount(count)} more ${pluralize(count, "kind", "kinds")} of item. ${pluralize(count, "It is", "They are all")} included.`,
    willFree: (size: string) =>
      `About ${size} will be removed, and that space is freed right away.`,
    willDeleteChosen: (size: string) => `${size} you chose will be deleted for good.`,
    toolsMayFree: (size: string) =>
      `Cleanup tools may free up to ${size} more. Each tool decides what is safe to remove, so this is an estimate.`,
    willTrash: (size: string) =>
      `${size} goes to the Trash. It frees no space until you empty the Trash.`,
    appRunning: (app: string) => `${app} is open. Quit it first (Cmd+Q, not just the window).`,
    blockReasons: {
      [BlockReason.ManualOnly]: "free this space yourself; open it for steps",
      [BlockReason.Protected]: "yours to keep; whyfull never removes this",
      [BlockReason.OutsideScanRoot]: "outside the folder that was scanned",
      [BlockReason.ChangedSinceScan]: "changed since the scan; scan again first",
      [BlockReason.AppRunning]: `its app is open; ${QUIT_APP_ADVICE}`,
      [BlockReason.ToolMissing]: "its cleanup tool isn't installed; install it to clean this",
      [BlockReason.OutsideHighRiskArea]: "outside your home folder; whyfull can't delete it",
      [BlockReason.SyncedFolder]: "in a synced folder; deleting it here deletes it everywhere",
      [BlockReason.PersonalLibrary]: "part of Photos, Mail, Messages or your passwords",
      [BlockReason.TheTrash]: "the Trash; empty it in Finder",
      [BlockReason.InsidePackage]: "part of an app or library; deleting a piece breaks it",
      [BlockReason.InsideRecognizedItem]: "part of something whyfull knows; select that instead",
      [BlockReason.ContainsKeptItem]: "holds something whyfull never deletes",
    } satisfies Readonly<Record<BlockReason, string>>,
    nothingToDo: "Nothing selected can be cleaned automatically.",
    confirmAction: "clean up now",
    cancelAction: "cancel",
    running: (done: string, total: string) => `Cleaning… ${done} of ${total} done`,
    reportTitle: "Cleanup finished",
    measuredGain: (size: string) => `Your disk now has ${size} more free space.`,
    removed: (size: string) => `Removed about ${size}.`,
    nothingFreed: (target: string) =>
      `${target} was cleaned, but no space came back yet. There may have been nothing left to remove, or macOS may take a moment to update your free space.`,
    highRiskRemoved: (size: string) => `Deleted for good, as you chose: ${size}.`,
    stillThere: (size: string) => `${size} is still there`,
    trashed: (size: string) =>
      `Moved ${size} to the Trash. It frees no space until you empty the Trash.`,
    problems: "Some items were not cleaned:",
    outcomes: {
      [OutcomeKind.Done]: "done",
      [OutcomeKind.PartlyDeleted]: "partly deleted",
      [OutcomeKind.Failed]: "failed; scan again and try once more",
      [OutcomeKind.SkippedBecauseChanged]: "changed since review, left alone",
      [OutcomeKind.SkippedBecauseAppOpened]: "its app was opened since review, left alone",
    } satisfies Readonly<Record<OutcomeKind, string>>,
    scanAgainAction: "scan again",
    cartSummary: (count: string, size: string) => `review cleanup (${count} · ${size})`,
    confirmationWord: CONFIRMATION_WORD,
    typeToConfirm: (word: string) =>
      `To delete these for good, type "${word}" and press ${key(UserAction.Open)}: `,
    confirmTypedAction: "delete now",
  },

  unexplainedLabel: "not recognized",

  highRisk: {
    title: "⚠ Turn on high-risk mode?",
    body: "Turn this on to delete folders and files whyfull doesn't recognize. They skip the Trash and can't be put back, so keep a backup of anything important. It stays on until you quit whyfull.",
    keptHeading: "Never deleted, even in this mode:",
    kept: "iCloud Drive and other synced folders, Photos, Mail, Messages, your passwords, and files inside apps.",
    warningMark: "⚠",
    turnOffAction: "turn off high-risk mode",
    followUp: `Nothing is deleted yet. You will see everything first, then type "${CONFIRMATION_WORD}" to confirm.`,
    keys: {
      [DialogKey.TurnOn]: "turn on",
      [DialogKey.Cancel]: "cancel",
    } satisfies Readonly<Record<DialogKey, string>>,
    badge: "⚠ High-risk mode",
    invite: `whyfull doesn't recognize this, so it can't tell if it's safe. Press ${key(UserAction.HighRiskMode)} to delete it yourself in high-risk mode.`,
    manualOnlyInvite: `whyfull can't remove this for you. Open it to see how, or press ${key(UserAction.HighRiskMode)} to delete it yourself in high-risk mode.`,
    turnedOn: `High-risk mode is on. Press ${key(UserAction.HighRiskMode)} to turn it off.`,
    turnedOnAndAdded: `High-risk mode is on, and the item is in your cleanup. Press ${key(UserAction.HighRiskMode)} to turn the mode off.`,
    turnedOff: "High-risk mode is off.",
    turnedOffAndRemoved: (count: number) =>
      `High-risk mode is off. ${formatCount(count)} ${pluralize(count, "item you chose was", "items you chose were")} taken out of the cleanup.`,
    added: "Added. It will be deleted for good.",
    blocked: {
      [BlockReason.OutsideHighRiskArea]: () =>
        "whyfull can only delete things in your home folder and on external disks.",
      [BlockReason.SyncedFolder]: () =>
        "This is in iCloud Drive or another synced folder. Deleting it here deletes it on all your devices. Use Finder if you're sure.",
      [BlockReason.PersonalLibrary]: () =>
        "This is part of Photos, Mail, Messages or your passwords. Manage it in its own app.",
      [BlockReason.TheTrash]: () => "This is the Trash. Empty it in Finder.",
      [BlockReason.Protected]: () =>
        "This holds folders whyfull never deletes, like Documents or Library.",
      [BlockReason.InsidePackage]: () =>
        "This is part of an app or library file. Deleting one piece breaks the whole thing.",
      [BlockReason.InsideRecognizedItem]: (name: string) =>
        `This is part of "${name}". Select that instead.`,
      [BlockReason.ContainsKeptItem]: (name: string) =>
        `This holds ${name}, which whyfull never deletes.`,
    } satisfies Readonly<Record<HighRiskBlockReason, (name: string) => string>>,
    warnings: {
      [HighRiskWarning.RecentlyChanged]: (days: string) =>
        `Changed in the last ${days} days. You may still be using this.`,
      [HighRiskWarning.HasPersonalFiles]: () => "Has photos, videos or documents.",
      [HighRiskWarning.AppData]: () => "App data. An app may lose its settings or stop working.",
    } satisfies Readonly<Record<HighRiskWarning, (days: string) => string>>,
    detail: {
      notRecognized: "Not recognized by whyfull",
      facts: (age: string, files: number) =>
        `Last changed ${age} · ${formatCount(files)} ${pluralize(files, "file", "files")}`,
      ifDeleted:
        "If you delete it, whyfull can't tell what stops working. Make sure you don't need it.",
      inviteOff: `Press ${key(UserAction.HighRiskMode)} to delete it yourself in high-risk mode, or ${key(UserAction.AskAssistant)} to ask your AI assistant about it.`,
      inviteOn: `Press ${key(UserAction.ToggleCleanup)} to add it to your cleanup. It will be deleted for good.`,
      added: `✓ In your cleanup. It will be deleted for good. Press ${key(UserAction.ToggleCleanup)} to take it out.`,
    },
    listTag: "⚠ high-risk",
    browseTag: "⚠ Delete for good",
  },

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

  status: {
    remove: "Safe to remove. It comes back when needed.",
    tool: (toolName: string) => `Safe, but only with ${toolName}.`,
    trash: "Check first. whyfull moves it to the Trash.",
    yourself: "Check first. You free this space yourself.",
    protected: "Yours. whyfull never changes this.",
  },

  ownerToolNames: {
    [OwnerToolId.DockerPrune]: "Docker's own cleanup",
    [OwnerToolId.SimulatorCleanup]: "Xcode's own simulator cleanup",
  } satisfies Readonly<Record<OwnerToolId, string>>,

  whoCleansUp: {
    remove: "whyfull can remove this for you.",
    trash: "whyfull can move this to the Trash for you. You can put it back from there.",
    tool: (toolName: string) => `whyfull can clean this for you with ${toolName}.`,
    yourself: "whyfull won't change this. You free the space yourself:",
    protected: "whyfull never changes this. Manage it in its app:",
  },

  addToCleanup: {
    one: `Press ${key(UserAction.ToggleCleanup)} to add it to your cleanup.`,
    several: `Press ${key(UserAction.ToggleCleanup)} to add every place below, or move to one place to add just that one.`,
    some: `Some places are in your cleanup. Press ${key(UserAction.ToggleCleanup)} to add the rest, or ${key(UserAction.ReviewCleanup)} to review.`,
    added: `✓ In your cleanup. Press ${key(UserAction.ReviewCleanup)} to review, or ${key(UserAction.ToggleCleanup)} to take it out.`,
  },

  actions: {
    [UserAction.MoveUp]: "move",
    [UserAction.MoveDown]: "move",
    [UserAction.PageUp]: "scroll a page",
    [UserAction.PageDown]: "scroll a page",
    [UserAction.Open]: "open",
    [UserAction.Back]: "back",
    [UserAction.BrowseFolders]: "browse folders",
    [UserAction.AskAssistant]: "ask AI assistant",
    [UserAction.ShowDiskOverview]: "disk overview",
    [UserAction.ScanWholeDisk]: "scan whole disk",
    [UserAction.FixPermissions]: "let whyfull see everything",
    [UserAction.ToggleCleanup]: "add to cleanup",
    [UserAction.ConfirmCleanup]: "confirm cleanup",
    [UserAction.ReviewCleanup]: "review cleanup",
    [UserAction.ShowGrowth]: "what grew",
    [UserAction.CycleFilter]: "filter",
    [UserAction.HighRiskMode]: "high-risk mode",
    [UserAction.Help]: "help",
    [UserAction.Quit]: "quit",
  } satisfies Readonly<Record<UserAction, string>>,

  groups: {
    [FindingGroup.Safe]: {
      title: "Safe to clear",
      hint: "These come back on their own when needed.",
    },
    [FindingGroup.Check]: {
      title: "Check first",
      hint: "You decide. Goes to the Trash after you confirm.",
    },
    [FindingGroup.Unrecognized]: {
      title: "Not recognized",
      hint: `Press ${key(UserAction.AskAssistant)} to ask your AI assistant about one.`,
    },
    [FindingGroup.Keep]: { title: "Yours to keep", hint: "whyfull never changes these." },
  } satisfies Readonly<Record<FindingGroup, { title: string; hint: string }>>,

  filters: {
    [FindingFilter.All]: "All",
    [FindingFilter.Safe]: "Safe",
    [FindingFilter.Check]: "Check",
    [FindingFilter.Unrecognized]: "Not recognized",
    [FindingFilter.Keep]: "Yours",
  } satisfies Readonly<Record<FindingFilter, string>>,

  list: {
    moreAbove: (count: string) => `${count} more above`,
    moreBelow: (count: string) => `${count} more below`,
  },

  copyAction: "copy",
  closeHelpAction: "close help",
  scrollAction: "scroll",

  help: {
    title: "How whyfull works",
    intro: [
      "whyfull looks through your files and explains what is using your disk.",
      "While it scans, it only reads and sends nothing anywhere. It changes nothing unless you review and confirm a cleanup.",
    ],
    marksHeading: "What the marks mean",
    marks: {
      safe: "whyfull can clean it, and it comes back when needed.",
      check: "you decide. It goes to the Trash only after you confirm.",
      keep: "whyfull never changes it. Manage it in its own app.",
      unknown: `whyfull doesn't recognize it. Press ${key(UserAction.AskAssistant)} to ask an AI about it, or use high-risk mode if you're sure.`,
    },
    stepsHeading: "How to clean up",
    steps: {
      select: "pick what you want gone",
      review: "see exactly what will happen",
      confirm: "start the cleanup",
    },
    highRiskHeading: "Something whyfull doesn't recognize?",
    highRisk: "turn on high-risk mode to delete it for good. You confirm by typing delete.",
    groups: {
      look: "Look around",
      clean: "Clean up",
      more: "More",
    },
  },
} as const;
