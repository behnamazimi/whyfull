import {
  BlockReason,
  ChangeDirection,
  Category,
  CleanupActionKind,
  FindingGroup,
  HighRiskWarning,
  OutcomeKind,
  OwnerToolId,
  ToolProblem,
  UsageShareKind,
  type HighRiskBlockReason,
} from "../../domain/index.ts";
import { formatCount } from "../format/count-format.ts";
import { pluralize } from "../format/plural-format.ts";
import { DialogKey, keyLabel, UserAction } from "../keymap.ts";
import { Glyph } from "../theme.ts";
import type { Tab } from "../tui/state/screen.ts";

const key = (action: UserAction): string => `"${keyLabel[action]}"`;
const CONFIRMATION_WORD = "delete";
const PROJECT_URL = "https://github.com/behnamazimi/whyfull";
const QUIT_APP_ADVICE = "quit it first (Cmd+Q, not just the window)";

// Shown both in the review (why an item is left out) and in the report (why it failed). Rows are cut
// from the end when the terminal is narrow, so each starts with the cause and then gives the fix.
const toolProblems = {
  [ToolProblem.NotInstalled]: "its tool isn't installed; install it",
  // Only the simulator tool produces this: xcrun exists without Xcode, but simctl doesn't.
  [ToolProblem.Unusable]: "needs Xcode installed and selected",
  [ToolProblem.NotRunning]: "its app isn't running; open it first",
  [ToolProblem.NotResponding]: "its tool isn't responding; check its app",
  [ToolProblem.WrongEngine]: "set up for a different app",
  [ToolProblem.TimedOut]:
    "the tool took too long and may have partly finished; check your free space",
  [ToolProblem.Failed]: "the tool reported an error and stopped",
} satisfies Readonly<Record<ToolProblem, string>>;

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
  report: {
    scanRoot: (path: string) => `Looking in ${path}`,
    title: "Here's where your space went",
  },

  frame: {
    diskSummary: (percent: string, free: string, capacity: string) =>
      `${percent} full · ${free} free of ${capacity}`,
    diskUnknown: "Measuring your disk…",
    scope: {
      wholeDisk: "Whole disk",
      homeFolder: "Home folder",
      yourHomeFolder: "your home folder",
    },
    cartCount: (count: number) => `(${formatCount(count)})`,
    looking: (scope: string) => `Looking in: ${scope}`,
    scanned: (scope: string) => `Scanned: ${scope}`,
  },

  tabs: {
    cleanup: "Cleanup",
    folders: "Folders",
    disk: "Disk",
    grew: "What grew",
  } satisfies Readonly<Record<Tab, string>>,

  summary: {
    safeSoFar: "can be cleared safely so far",
    diskIs: "Your disk is ",
    percentFull: (percent: string) => `${percent} full`,
    freeOf: (free: string, capacity: string) => `${free} free of ${capacity}`,
    usedOf: (used: string, capacity: string) => `${used} used of ${capacity}`,
    afterCleanup: (free: string) => `→ ${free} free`,
    afterTrash: (size: string) => `+${size} after you empty the Trash`,
    moreWithTools: (size: string) => `up to ${size} more with app tools`,
    pickToSeeGain: "pick items to see how much you would free",
    scopeFolder: (path: string, scanned: string, used: string) =>
      `Looked at ${path} only (${scanned} of the ${used} in use).`,
    scopeFolderOnly: (path: string, scanned: string) => `Looked at ${path} only (${scanned}).`,
    scopeWholeDisk: (scanned: string) => `Looked at the whole disk (${scanned}).`,
    checkWholeDisk: (key: string) => ` Press "${key}" to check the whole disk.`,
    inThisFolder: (size: string) => `${size} in this folder`,
    foldersNote:
      "Sorted by size. Open a folder to look inside. Only items whyfull recognizes can be cleaned.",
    diskNote: (key: string) =>
      `The bar and the list match. Only the first row is explained item by item: press "${key}".`,
    firstScan: "First scan",
    sinceLastScan: (age: string) => `since your last scan (${age})`,
    foldersGrew: (count: number) =>
      `${formatCount(count)} ${pluralize(count, "folder", "folders")} grew`,
    growthNote: (size: string) => `Only growth above ${size} is listed.`,
  },

  actionBar: {
    selected: (size: string) => `${size} selected`,
    items: (count: string, amount: number) => `${count} ${pluralize(amount, "item", "items")}`,
    confirmNote: "nothing runs until you confirm",
    waitingForFirstResults: "Cleanup opens as soon as the first folders are measured",
    nothingSelected: "Nothing selected yet.",
    pressToSelect: (key: string) => `Press ${key} to select an item.`,
    selectAllSafe: (size: string) => `select all safe items (${size})`,
    includesHighRisk: "includes items that will be deleted for good",
    scanFailed: "Cleanup isn't available because the scan stopped.",
    review: "Review and clean up",
    reviewAndFree: (size: string) => `Review and free ${size}`,
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
    sizesMayGrow: "Sizes can still grow while the scan runs.",
    checkedSoFar: (percent: string, size: string) => `${percent} · ${size} checked`,
    nothingYet: "Nothing big found yet. Results appear here as the scan finds them.",
    failed: (reason: string) => `The scan stopped unexpectedly (${reason}). Try scanning again.`,
  },

  diagnosis: {
    empty: `No big space users found here. Press ${key(UserAction.BrowseFolders)} to browse folders yourself.`,
    emptyWithFolders: "Nothing whyfull recognizes here. These are the biggest folders:",
    emptyBrowse: `Press ${key(UserAction.BrowseFolders)} to browse them, or ${key(UserAction.ScanWholeDisk)} to look at the whole disk.`,
    untouched: (size: string, months: string) => `${size} untouched for ${months}+ months`,
    issues: (count: number) =>
      `${formatCount(count)} ${pluralize(count, "folder couldn't", "folders couldn't")} be read. Grant Full Disk Access to see everything.`,
  },

  detail: {
    whatItIs: "What it is",
    beforeYouStart: "Before you start",
    ifRemoved: "If you remove it",
    whereItIs: "Where it is",
    places: (count: string) => `In ${count} places`,
    alsoCalled: (name: string) => `also called ${name}`,
    unknownCategory: "Unknown",
    appOpen: (app: string) =>
      `${app} is open. Quit it first (Cmd+Q, not just the window) to include this.`,
    add: "Add to cleanup",
    addEvery: "Add every place to your cleanup",
    addRest: "Add the rest to your cleanup",
    inCleanup: "✓ In your cleanup. Remove",
    addForGood: "Add to cleanup (deleted for good)",
    inCleanupForGood: "✓ In your cleanup, deleted for good. Remove",
    askAssistant: "Ask your AI assistant what this is",
    lookInside: "Look inside",
    lookAtPlaces: "Look at each place",
  },

  checks: {
    deletes: "whyfull deletes it. Nothing else is needed.",
    emptiesTrash: "whyfull empties the Trash. What is in it is deleted for good.",
    toTrash: "It goes to the Trash. You can put it back from there.",
    toolOnReview: (toolName: string) => `whyfull checks ${toolName} when you review.`,
  },

  tree: {
    empty: "This folder is empty or couldn't be read.",
    fileTag: "File",
    folderTag: "Folder",
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
    summaryCopied: "Copied. Paste it anywhere you want to share it.",
    nothingToShare:
      "There is nothing to share yet: no space came back and nothing went to the Trash.",
    copyFailed: (reason: string) => `Couldn't copy to the clipboard (${reason}). Try again.`,
    waitForScan: "You can do this once the scan finishes.",
    cleanupAfterScan:
      "Cleanup opens as soon as the first folders are measured. Your picks are kept.",
    quitHint: `This is the first screen. Press ${key(UserAction.Quit)} to quit.`,
    summaryAfterCleanup: "You can copy a summary after a cleanup finishes.",
    nothingSafeYet: "No safe items found yet.",
    selectedSafe: (count: string, size: string) =>
      `Selected ${count} safe ${pluralize(Number(count), "item", "items")} (${size}). Nothing runs until you confirm.`,
    nothingToAskAbout: "Select a folder first.",
    settingsOpened:
      "System Settings is open. Turn on your terminal app, quit and reopen it, then run whyfull again.",
    revealFailed: (reason: string) => `Couldn't open Finder (${reason}).`,
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
    seeItemByItem: "See it item by item on Cleanup",
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
    whatChanged: "What changed",
    fromTo: (before: string, after: string) => `It was ${before} and is now ${after}.`,
    grewVerdict: "This folder grew",
    howItWorksVerdict: "It compares two scans.",
    howItWorksLabel: "What it does",
    howItWorks:
      "Each time you run whyfull it remembers what it found. This tab lists the folders that grew since the last time.",
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
      [CleanupActionKind.EmptyTrash]: {
        title: "Empty the Trash",
        hint: "everything in it is deleted for good",
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
    aside: (kinds: number, leftOut: number, leftOutSize: string) =>
      `${formatCount(kinds)} ${pluralize(kinds, "kind", "kinds")} of item · ${
        leftOut === 0 ? "none left out" : `${formatCount(leftOut)} left out (${leftOutSize})`
      }`,
    toFree: (size: string) => `${size} to free now`,
    toTrash: (size: string) => `${size} goes to the Trash`,
    toFreeWithTools: (size: string, toolsSize: string) =>
      `${size} to free now · up to ${toolsSize} more with tools`,
    toolsOnly: (toolsSize: string) => `up to ${toolsSize} with tools`,
    tools: {
      [OwnerToolId.DockerPrune]: "Docker's own cleanup (docker system prune)",
      [OwnerToolId.SimulatorCleanup]: "Xcode's own simulator cleanup (xcrun simctl)",
    } satisfies Readonly<Record<OwnerToolId, string>>,
    andMore: (count: string) => ` and ${count} more`,
    mergedPlaces: (count: string) => ` · ${count} places`,
    groupPlaces: (count: string) => ` · ${count} places`,
    morePlaces: (count: string) => `and ${count} more`,
    hiddenGroups: (count: number) =>
      `… and ${formatCount(count)} more ${pluralize(count, "kind", "kinds")} of item. ${pluralize(count, "It is", "They are all")} included.`,
    willFree: (size: string) =>
      `About ${size} will be removed, and that space is freed right away.`,
    willDeleteChosen: (size: string) => `${size} you chose will be deleted for good.`,
    toolsMayFree: (size: string) =>
      `Cleanup tools may free up to ${size} more. Each tool decides what is safe to remove, so this is an estimate.`,
    willEmptyTrash: (size: string) =>
      `${size} in the Trash is deleted for good, and that space is freed right away.`,
    emptyTrashAction: "empty the Trash",
    emptyTrashOffer: `Press ${key(UserAction.ConfirmCleanup)} to empty the Trash now and get that space back.`,
    willTrash: (size: string) =>
      `${size} goes to the Trash. It frees no space until you empty the Trash.`,
    appRunning: (app: string) => `${app} is open. Quit it first (Cmd+Q, not just the window).`,
    blockReasons: {
      [BlockReason.ManualOnly]: "free this space yourself; open it for steps",
      [BlockReason.Protected]: "yours to keep; whyfull never removes this",
      [BlockReason.OutsideScanRoot]: "outside the folder that was scanned",
      [BlockReason.ChangedSinceScan]: "changed since the scan; scan again first",
      [BlockReason.AppRunning]: `its app is open; ${QUIT_APP_ADVICE}`,
      [BlockReason.ToolMissing]: toolProblems[ToolProblem.NotInstalled],
      [BlockReason.ToolUnusable]: toolProblems[ToolProblem.Unusable],
      [BlockReason.ToolNotRunning]: toolProblems[ToolProblem.NotRunning],
      [BlockReason.ToolNotResponding]: toolProblems[ToolProblem.NotResponding],
      [BlockReason.ToolWrongEngine]: toolProblems[ToolProblem.WrongEngine],
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
    recheckAction: "check again",
    running: (done: string, total: string) => `Cleaning… ${done} of ${total} done`,
    reportTitle: "Cleanup finished",
    measuredGain: (size: string) => `Your disk now has ${size} more free space.`,
    nothingCleaned: "Nothing was cleaned.",
    toolProblems,
    toolNotes: {
      [OwnerToolId.DockerPrune]:
        "Removes stopped containers, unused images, networks and build cache. Docker downloads images again when needed.",
      [OwnerToolId.SimulatorCleanup]:
        "Removes only simulators whose system version is no longer installed, with their app data.",
    } satisfies Readonly<Record<OwnerToolId, string>>,
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
      [OutcomeKind.Failed]: "failed",
      [OutcomeKind.SkippedBecauseChanged]: "changed since review, left alone",
      [OutcomeKind.SkippedBecauseAppOpened]: "its app was opened since review, left alone",
    } satisfies Readonly<Record<OutcomeKind, string>>,
    scanAgainAction: "back to the list",
    share: {
      freed: (size: string) => `I freed ${size} on my Mac with whyfull.`,
      trashed: (size: string) =>
        `I moved ${size} to the Trash with whyfull. Emptying the Trash gives that space back.`,
      about: `whyfull explains what is filling your disk, and removes nothing until you review it. It is free and open source: ${PROJECT_URL}`,
    },
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
  },

  categories: {
    [Category.DeveloperFiles]: "Programming tools",
    [Category.ContainersAndVirtualMachines]: "Virtual machines & Docker",
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

  /** A few words beside a row, for what happens to it. The detail pane says the rest. */
  chips: {
    viaTool: {
      [OwnerToolId.DockerPrune]: "via Docker",
      [OwnerToolId.SimulatorCleanup]: "via Xcode",
    } satisfies Readonly<Record<OwnerToolId, string>>,
    toTrash: "→ Trash",
    emptiesTrash: "empties Trash",
    byHand: "by hand",
    quitApp: (app: string) => `${Glyph.warning} quit ${app}`,
    safeInside: (size: string) => `${size} safe`,
    shareOfDisk: (percent: string) => `${percent} of disk`,
    partUnread: `${Glyph.warning} part unread`,
  },

  tags: {
    safeToRemove: "Safe",
    safeWithTool: "Safe",
    reviewThenTrash: "Check",
    reviewYourself: "Check",
    emptyTrash: "Check",
    keep: "Yours",
  },

  status: {
    remove: "Safe to remove. It comes back when needed.",
    tool: (toolName: string) => `Safe, but only with ${toolName}.`,
    trash: "Check first. whyfull moves it to the Trash.",
    emptyTrash: "Check first. whyfull empties the Trash for you.",
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
    emptyTrash: "whyfull can empty the Trash for you. What is in it is deleted for good.",
    tool: (toolName: string) => `whyfull can clean this for you with ${toolName}.`,
    yourself: "whyfull won't change this. You free the space yourself:",
    protected: "whyfull never changes this. Manage it in its app:",
  },

  actions: {
    [UserAction.MoveUp]: "Move",
    [UserAction.MoveDown]: "Move",
    [UserAction.PageUp]: "Scroll a page",
    [UserAction.PageDown]: "Scroll a page",
    [UserAction.Open]: "Open",
    [UserAction.Back]: "Back",
    [UserAction.ShowCleanup]: "Cleanup",
    [UserAction.BrowseFolders]: "Folders",
    [UserAction.AskAssistant]: "Ask AI assistant",
    [UserAction.ShowDiskOverview]: "Disk",
    [UserAction.ScanWholeDisk]: "Check the whole disk",
    [UserAction.FixPermissions]: "Let whyfull see everything",
    [UserAction.RevealInFinder]: "Show in Finder",
    [UserAction.Recheck]: "Check again",
    [UserAction.ToggleCleanup]: "Select",
    [UserAction.SelectAllSafe]: "Select all safe",
    [UserAction.ConfirmCleanup]: "Confirm cleanup",
    [UserAction.ReviewCleanup]: "Review and clean up",
    [UserAction.ShowGrowth]: "What grew",
    [UserAction.CopySummary]: "Copy a summary to share",
    [UserAction.HighRiskMode]: "High-risk mode",
    [UserAction.Help]: "More",
    [UserAction.Quit]: "Quit",
  } satisfies Readonly<Record<UserAction, string>>,

  groups: {
    [FindingGroup.Safe]: {
      title: "Safe to clear",
      hint: "These come back on their own when needed.",
    },
    [FindingGroup.NeedsApp]: {
      title: "Needs its app",
      hint: "Cleaned by the app's own tool. Less space may come back.",
    },
    [FindingGroup.Check]: {
      title: "Check first",
      hint: "You decide. Some go to the Trash; others you free yourself.",
    },
    [FindingGroup.Unrecognized]: {
      title: "Not recognized",
      hint: `whyfull doesn't know these yet. Press ${key(UserAction.AskAssistant)} to ask your AI assistant.`,
    },
    [FindingGroup.Keep]: { title: "Yours to keep", hint: "whyfull never changes these." },
  } satisfies Readonly<Record<FindingGroup, { title: string; hint: string }>>,

  /** What a group of the main list means, for the pane when the cursor is on its header. */
  groupPane: {
    what: {
      [FindingGroup.Safe]:
        "Files that apps and tools make so things run faster. Removing them loses nothing: they come back when needed.",
      [FindingGroup.NeedsApp]:
        "Space that only an app's own cleanup tool can free safely. whyfull runs that tool for you, and less space may come back.",
      [FindingGroup.Check]:
        "Things you may want to keep, so look at each one first. Some go to the Trash and some you free yourself.",
      [FindingGroup.Unrecognized]:
        "Big folders whyfull doesn't know yet, so it can't say what is safe. Look inside one, or ask your AI assistant.",
      [FindingGroup.Keep]:
        "Personal data and things other apps rely on. whyfull never changes these.",
    } satisfies Readonly<Record<FindingGroup, string>>,
    show: "Show this group",
    hide: "Hide this group",
    addAll: "Add all to your cleanup",
    clearAll: "✓ All in your cleanup. Remove",
    addRest: "Add the rest to your cleanup",
  },

  list: {
    itemCount: (count: number) => `${formatCount(count)} ${pluralize(count, "item", "items")}`,
    moreAbove: (count: string) => `${count} more above`,
    moreBelow: (count: string) => `${count} more below`,
  },

  copyAction: "Copy",
  closeHelpAction: "Close",
  scrollAction: "Scroll",

  help: {
    title: "More",
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
