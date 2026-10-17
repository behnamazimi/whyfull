import { KnownFolderId } from "../../domain/index.ts";

export interface FolderCopy {
  /** Short enough for the folder list's tag column. */
  readonly label: string;
  readonly whatItIs: string;
  readonly ifRemoved: string;
}

const SYNC_WARNING =
  "If iCloud keeps it in sync, deleting here deletes it on your other devices too.";

export const folderCopy: Readonly<Record<KnownFolderId, FolderCopy>> = {
  [KnownFolderId.Library]: {
    label: "Settings and data for your apps",
    whatItIs:
      "Your personal Library folder. macOS and your apps keep their settings, saved data and downloaded content here. Most people never open it.",
    ifRemoved:
      "Apps would lose their settings and saved data. Don't delete this folder. Open it to see which app is using the space.",
  },
  [KnownFolderId.ApplicationSupport]: {
    label: "Data that apps need to run",
    whatItIs:
      "Where apps keep what they need to work: databases, downloaded content, plug-ins and sometimes your own work. Each folder inside is usually named after an app.",
    ifRemoved:
      "An app can lose its settings or what you made in it, and some of that can't be rebuilt. Look at the biggest folder first and check which app it belongs to.",
  },
  [KnownFolderId.Containers]: {
    label: "Saved data of sandboxed apps",
    whatItIs:
      "Saved data for apps that run in macOS's protected sandbox, including many App Store apps. Each folder inside belongs to one app.",
    ifRemoved: "That app loses its saved data and settings.",
  },
  [KnownFolderId.GroupContainers]: {
    label: "Data shared between apps",
    whatItIs:
      "Data shared between apps from the same company, for example an app and its extensions.",
    ifRemoved: "The apps that share it can lose settings or saved data.",
  },
  [KnownFolderId.ICloudDrive]: {
    label: "Your iCloud Drive files",
    whatItIs: "Where macOS keeps your iCloud Drive files and the data of apps that use iCloud.",
    ifRemoved:
      "Deleting files here removes them from iCloud and your other devices too. Use Finder to choose what stays on this Mac.",
  },
  [KnownFolderId.Downloads]: {
    label: "Files you downloaded",
    whatItIs:
      "Files you downloaded from the internet. This often holds old installers, zip files and documents you no longer need.",
    ifRemoved: "Anything you still need would be gone, so look through it before deleting.",
  },
  [KnownFolderId.Desktop]: {
    label: "Files on your desktop",
    whatItIs: "Everything you keep on your desktop.",
    ifRemoved: `These are your own files. ${SYNC_WARNING}`,
  },
  [KnownFolderId.Documents]: {
    label: "Your documents",
    whatItIs: "Your documents and other files you saved yourself.",
    ifRemoved: `These are your own files. ${SYNC_WARNING}`,
  },
  [KnownFolderId.Movies]: {
    label: "Videos and video projects",
    whatItIs:
      "Videos and recordings. Apps like iMovie and Final Cut Pro often keep their projects here too.",
    ifRemoved: "Videos and video projects would be gone. Check which ones you still need first.",
  },
  [KnownFolderId.Music]: {
    label: "Your music and music projects",
    whatItIs: "Your Music app files. GarageBand projects are often kept here too.",
    ifRemoved: "Music and projects you haven't backed up would be gone.",
  },
  [KnownFolderId.Pictures]: {
    label: "Your pictures",
    whatItIs: "Your pictures. The Photos app usually keeps its library here.",
    ifRemoved:
      "Pictures that exist nowhere else would be gone. Manage photos inside the Photos app.",
  },
};
