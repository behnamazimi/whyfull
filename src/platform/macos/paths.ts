import { KnownFolderId, PathTemplate } from "../../domain/index.ts";

const LIBRARY = "Library";
const CACHES = "Caches";
const APPLICATION_SUPPORT = "Application Support";
const CONTAINERS = "Containers";
const DEVELOPER = "Developer";

const inLibrary = (...segments: readonly string[]): PathTemplate =>
  PathTemplate.underHome(LIBRARY, ...segments);
const inCaches = (...segments: readonly string[]): PathTemplate => inLibrary(CACHES, ...segments);
const inApplicationSupport = (...segments: readonly string[]): PathTemplate =>
  inLibrary(APPLICATION_SUPPORT, ...segments);
const inXcode = (...segments: readonly string[]): PathTemplate =>
  inLibrary(DEVELOPER, "Xcode", ...segments);

export const MacPaths = {
  applicationCaches: inCaches(),
  userLogs: inLibrary("Logs"),
  trash: PathTemplate.underHome(".Trash"),
  downloads: PathTemplate.underHome("Downloads"),

  dockerDesktop: inLibrary(CONTAINERS, "com.docker.docker"),
  orbStack: PathTemplate.underHome(".orbstack"),
  utm: inLibrary(CONTAINERS, "com.utmapp.UTM"),
  parallels: PathTemplate.underHome("Parallels"),

  xcodeDerivedData: inXcode("DerivedData"),
  xcodeArchives: inXcode("Archives"),
  xcodeDeviceSupport: inXcode("iOS DeviceSupport"),
  iosSimulators: inLibrary(DEVELOPER, "CoreSimulator", "Devices"),
  iosDeviceBackups: inApplicationSupport("MobileSync", "Backup"),

  homebrewCache: inCaches("Homebrew"),
  pnpmStore: inLibrary("pnpm", "store"),
  yarnCache: inCaches("Yarn"),
  pipCache: inCaches("pip"),
  cocoaPodsCache: inCaches("CocoaPods"),

  chromeCache: inCaches("Google", "Chrome"),
  safariCache: inCaches("com.apple.Safari"),
  firefoxCache: inCaches("Firefox"),
  slackCache: inApplicationSupport("Slack", "Cache"),
  teamsCache: inLibrary(CONTAINERS, "com.microsoft.teams2", "Data", LIBRARY, CACHES),
  discordCache: inApplicationSupport("discord", "Cache"),
  spotifyCache: inCaches("com.spotify.client"),
  notionCaches: [
    inApplicationSupport("Notion", "Partitions", "notion", "Service Worker", "CacheStorage"),
    inApplicationSupport("Notion", "Partitions", "notion", "Cache"),
  ],
  androidSdk: inLibrary("Android", "sdk"),
  coreSimulatorCaches: inLibrary(DEVELOPER, "CoreSimulator", "Caches"),
  adobeMediaCache: inApplicationSupport("Adobe", "Common", "Media Cache Files"),
  virtualBox: PathTemplate.underHome("VirtualBox VMs"),
  vmwareFusion: PathTemplate.underHome("Virtual Machines.localized"),
  mail: inLibrary("Mail"),
  aerialWallpapers: inApplicationSupport("com.apple.wallpaper", "aerials", "videos"),

  fullDiskAccessProbes: [inLibrary("Safari"), inLibrary("Mail"), inLibrary("Messages")],

  steamGames: inApplicationSupport("Steam", "steamapps"),
  photosLibrary: PathTemplate.underHome("Pictures", "Photos Library.photoslibrary"),
  messagesAttachments: inLibrary("Messages", "Attachments"),

  keychains: inLibrary("Keychains"),
  sshKeys: PathTemplate.underHome(".ssh"),
  gpgKeys: PathTemplate.underHome(".gnupg"),
  iCloudDrive: inLibrary("Mobile Documents"),
  browserProfiles: [
    inApplicationSupport("Google", "Chrome"),
    inApplicationSupport("Firefox"),
    inApplicationSupport("BraveSoftware", "Brave-Browser"),
    inApplicationSupport("Microsoft Edge"),
    inLibrary("Safari"),
  ],
} as const;

export const InstallerExtension = {
  DiskImage: "dmg",
  Package: "pkg",
  OpticalDiscImage: "iso",
  XcodeArchive: "xip",
} as const;

// Firmlinks make /System/Volumes/Data mirror /Users, /Applications and the other data folders,
// all on the same device number, so the whole-disk scan skips the mirror to count them once.
export const SystemLocation = {
  root: "/",
  mountedVolumes: "/System/Volumes",
} as const;

const EXTERNAL_VOLUMES = "Volumes";

export const SystemPaths = {
  applications: PathTemplate.underRoot("Applications"),
  systemFiles: PathTemplate.underRoot("System"),
  virtualMemory: PathTemplate.underRoot("private", "var", "vm"),
  temporaryFiles: PathTemplate.underRoot("private", "var", "folders"),
  homebrew: PathTemplate.underRoot("opt", "homebrew"),
  unityEditors: PathTemplate.underRoot("Applications", "Unity", "Hub", "Editor"),
} as const;

export const MacKnownFolders: Readonly<Record<KnownFolderId, PathTemplate>> = {
  [KnownFolderId.Library]: inLibrary(),
  [KnownFolderId.ApplicationSupport]: inApplicationSupport(),
  [KnownFolderId.Containers]: inLibrary(CONTAINERS),
  [KnownFolderId.GroupContainers]: inLibrary("Group Containers"),
  [KnownFolderId.ICloudDrive]: inLibrary("Mobile Documents"),
  [KnownFolderId.Downloads]: PathTemplate.underHome("Downloads"),
  [KnownFolderId.Desktop]: PathTemplate.underHome("Desktop"),
  [KnownFolderId.Documents]: PathTemplate.underHome("Documents"),
  [KnownFolderId.Movies]: PathTemplate.underHome("Movies"),
  [KnownFolderId.Music]: PathTemplate.underHome("Music"),
  [KnownFolderId.Pictures]: PathTemplate.underHome("Pictures"),
};

export const ProtectedLocations: readonly PathTemplate[] = [
  PathTemplate.underRoot(),
  PathTemplate.underRoot("System"),
  PathTemplate.underRoot("Applications"),
  PathTemplate.underRoot("Library"),
  PathTemplate.underRoot("Users"),
  PathTemplate.underRoot("private"),
  PathTemplate.underRoot("opt", "homebrew"),
  PathTemplate.underHome(),
  PathTemplate.underHome("Documents"),
  PathTemplate.underHome("Desktop"),
  PathTemplate.underHome("Downloads"),
  PathTemplate.underHome("Pictures"),
  PathTemplate.underHome("Movies"),
  PathTemplate.underHome("Music"),
  PathTemplate.underHome(".ssh"),
  inLibrary(),
  inLibrary(CACHES),
  inLibrary(APPLICATION_SUPPORT),
  inLibrary(CONTAINERS),
  inLibrary("Mobile Documents"),
  inLibrary("CloudStorage"),
];

// Bundles that Finder shows as a single file. Removing a piece breaks the whole bundle.
export const PackageExtension = {
  Application: "app",
  PhotosLibrary: "photoslibrary",
  FinalCutLibrary: "fcpbundle",
  LogicProject: "logicx",
  GarageBandProject: "band",
  MusicLibrary: "musiclibrary",
  TvLibrary: "tvlibrary",
  IMovieLibrary: "imovielibrary",
  Bundle: "bundle",
  Framework: "framework",
  PlugIn: "plugin",
} as const;

export const HighRiskPaths = {
  areas: [PathTemplate.underHome(), PathTemplate.underRoot(EXTERNAL_VOLUMES)],
  syncedFolders: [
    inLibrary("Mobile Documents"),
    inLibrary("CloudStorage"),
    PathTemplate.underHome("Dropbox"),
  ],
  personalLibraries: [
    MacPaths.photosLibrary,
    inLibrary("Mail"),
    inLibrary("Messages"),
    inLibrary("Keychains"),
    PathTemplate.underHome(".ssh"),
  ],
  theTrash: MacPaths.trash,
  appData: inLibrary(),
} as const;

export const APP_DATA_DIRECTORY = inApplicationSupport("whyfull");
