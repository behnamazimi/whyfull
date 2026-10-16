export const Category = {
  DeveloperFiles: "developer-files",
  ContainersAndVirtualMachines: "containers-and-virtual-machines",
  AppCaches: "app-caches",
  Installers: "installers",
  Backups: "backups",
  PhotosAndMessages: "photos-and-messages",
  AiModels: "ai-models",
  Games: "games",
  Trash: "trash",
  Logs: "logs",
  SystemAndApps: "system-and-apps",
} as const;
export type Category = (typeof Category)[keyof typeof Category];
