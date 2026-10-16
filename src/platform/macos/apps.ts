// Names as listed by `ps -axco comm=`, used to wait until an app is closed before cleaning its cache.
export const MacApp = {
  Chrome: "Google Chrome",
  Safari: "Safari",
  Firefox: "firefox",
  Slack: "Slack",
  Teams: "MSTeams",
  Discord: "Discord",
  Spotify: "Spotify",
  Notion: "Notion",
  Xcode: "Xcode",
} as const;
