import { PathTemplate } from "../../domain/index.ts";

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

  steamGames: inApplicationSupport("Steam", "steamapps"),
  photosLibrary: PathTemplate.underHome("Pictures", "Photos Library.photoslibrary"),
  messagesAttachments: inLibrary("Messages", "Attachments"),
} as const;

export const InstallerExtension = {
  DiskImage: "dmg",
  Package: "pkg",
  OpticalDiscImage: "iso",
  XcodeArchive: "xip",
} as const;
