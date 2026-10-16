import { RuleId } from "../../domain/index.ts";

export interface RuleCopy {
  readonly title: string;
  readonly whatItIs: string;
  readonly ifRemoved: string;
  readonly howToFreeSpace: string;
}

export const ruleCopy: Readonly<Record<RuleId, RuleCopy>> = {
  [RuleId.NodeModules]: {
    title: "JavaScript project dependencies (node_modules)",
    whatItIs: "Libraries downloaded for JavaScript projects. Every project keeps its own copy.",
    ifRemoved:
      "Nothing is lost. The project downloads them again the next time someone installs it.",
    howToFreeSpace: "Remove the folders of projects you're not working on.",
  },
  [RuleId.NextJsBuildCache]: {
    title: "Next.js build output (.next)",
    whatItIs: "Files a Next.js website project creates while building.",
    ifRemoved: "Nothing is lost. They are rebuilt on the next build.",
    howToFreeSpace: "Remove them for projects you're not working on.",
  },
  [RuleId.RustBuildOutput]: {
    title: "Rust build output (target)",
    whatItIs: "Compiled files from Rust projects. They grow with every build.",
    ifRemoved: "Nothing is lost. The next build takes longer while it recreates them.",
    howToFreeSpace: "Remove them for projects you're not working on.",
  },
  [RuleId.PythonVirtualEnvironment]: {
    title: "Python virtual environments",
    whatItIs: "Private copies of Python packages, one per project.",
    ifRemoved:
      "Nothing is lost, but the project needs its packages installed again before it runs.",
    howToFreeSpace: "Remove environments of projects you no longer use.",
  },
  [RuleId.PythonBytecodeCache]: {
    title: "Python speed-up files (__pycache__)",
    whatItIs: "Small speed-up files Python writes next to its code.",
    ifRemoved: "Nothing is lost. Python recreates them automatically.",
    howToFreeSpace: "Safe to remove at any time.",
  },
  [RuleId.GradleCaches]: {
    title: "Gradle download cache",
    whatItIs: "Downloaded libraries and build results for Android and Java projects.",
    ifRemoved: "Nothing is lost. The next build downloads what it needs again.",
    howToFreeSpace: "Safe to remove when you're not in the middle of a build.",
  },
  [RuleId.MavenRepository]: {
    title: "Maven library cache",
    whatItIs: "Downloaded libraries for Java projects.",
    ifRemoved: "Nothing is lost. The next build downloads what it needs again.",
    howToFreeSpace: "Safe to remove when you're not in the middle of a build.",
  },
  [RuleId.NpmCache]: {
    title: "npm download cache",
    whatItIs: "A copy of every JavaScript package npm has downloaded, kept to speed up installs.",
    ifRemoved: "Nothing is lost. Installs download packages again.",
    howToFreeSpace:
      "Safe to remove at any time. This also clears programs saved by npx, which npm's own cache command leaves behind.",
  },
  [RuleId.DockerDesktop]: {
    title: "Docker Desktop's virtual disk",
    whatItIs:
      "All Docker images, containers and volumes live inside one large file. It grows but doesn't shrink on its own, so the size shown includes space Docker already freed inside it.",
    ifRemoved:
      "Deleting the file by hand would destroy every container and volume. Use Docker's clean-up instead.",
    howToFreeSpace:
      "Use Docker's own cleanup. It removes stopped containers, unused networks, build cache, and every image no container uses. You would download those images again. Running containers, the images they use, and volumes are kept. Docker Desktop must be running. You may get back much less than the size shown. The file can stay large until Docker gives the space back. To shrink it right away, lower the disk image size in Docker Desktop's settings.",
  },
  [RuleId.OrbStack]: {
    title: "OrbStack containers and machines",
    whatItIs: "The disk used by OrbStack's Docker containers and Linux machines.",
    ifRemoved: "Deleting it by hand would destroy your containers and machines.",
    howToFreeSpace: "Open OrbStack and remove machines, images or volumes you no longer need.",
  },
  [RuleId.XcodeDerivedData]: {
    title: "Xcode build files (DerivedData)",
    whatItIs: "Temporary build results Xcode keeps for every project you have opened.",
    ifRemoved: "Nothing is lost. Xcode rebuilds them; the next build is slower.",
    howToFreeSpace: "Safe to remove while Xcode is closed.",
  },
  [RuleId.XcodeArchives]: {
    title: "Xcode app archives",
    whatItIs: "Copies of every app version you archived for release.",
    ifRemoved:
      "Old archives are needed to read crash reports for those versions. Keep the ones you still support.",
    howToFreeSpace: "Review them and move old versions to the Trash.",
  },
  [RuleId.XcodeDeviceSupport]: {
    title: "Xcode device support files",
    whatItIs: "Debugging files Xcode copies from every iPhone or iPad version you have connected.",
    ifRemoved: "Nothing is lost. Xcode copies them again when you connect that device.",
    howToFreeSpace: "Safe to remove while Xcode is closed.",
  },
  [RuleId.IosSimulators]: {
    title: "iOS simulators",
    whatItIs: "Virtual iPhones and iPads used to test apps, including old iOS versions.",
    ifRemoved: "Apps and data inside removed simulators are lost.",
    howToFreeSpace:
      "Remove simulators for iOS versions you no longer have. Xcode's simulator cleanup does this for you.",
  },
  [RuleId.IosDeviceBackups]: {
    title: "iPhone and iPad backups",
    whatItIs: "Full backups of your devices, made when you synced them with this Mac.",
    ifRemoved: "A backup you remove can't restore that device any more.",
    howToFreeSpace:
      "Keep the latest backup of each device you own. Move the rest to the Trash, or manage them in Finder.",
  },
  [RuleId.HomebrewCache]: {
    title: "Homebrew download cache",
    whatItIs: "Installers Homebrew downloaded for software you installed or updated.",
    ifRemoved: "Nothing is lost. Installed software keeps working.",
    howToFreeSpace: "Safe to remove at any time. Installed programs keep working.",
  },
  [RuleId.PnpmStore]: {
    title: "pnpm package store",
    whatItIs: "One shared copy of the JavaScript packages your projects use.",
    ifRemoved: "Your projects keep working. Installing packages later downloads them again.",
    howToFreeSpace:
      "Safe to remove. Packages your projects share with this store stay on disk until you delete those projects, so you may get back less than shown.",
  },
  [RuleId.YarnCache]: {
    title: "Yarn download cache",
    whatItIs: "Downloaded JavaScript packages kept to speed up installs.",
    ifRemoved: "Nothing is lost. Installs download packages again.",
    howToFreeSpace: "Safe to remove at any time.",
  },
  [RuleId.PipCache]: {
    title: "pip download cache",
    whatItIs: "Downloaded Python packages kept to speed up installs.",
    ifRemoved: "Nothing is lost. Installs download packages again.",
    howToFreeSpace: "Safe to remove at any time.",
  },
  [RuleId.CocoaPodsCache]: {
    title: "CocoaPods cache",
    whatItIs: "Downloaded libraries for iOS and Mac projects.",
    ifRemoved: "Nothing is lost. The next install downloads them again.",
    howToFreeSpace: "Safe to remove at any time.",
  },
  [RuleId.Trash]: {
    title: "Trash",
    whatItIs: "Files you deleted. They still use space until the Trash is emptied.",
    ifRemoved: "Emptying the Trash removes those files for good.",
    howToFreeSpace: "Check nothing important is there, then choose Finder > Empty Trash.",
  },
  [RuleId.DownloadedInstallers]: {
    title: "Installers in Downloads",
    whatItIs:
      "Disk images and installer packages. Once an app is installed, these are rarely needed.",
    ifRemoved:
      "Installed apps keep working. You would need to download an installer again to reinstall.",
    howToFreeSpace: "Review the list and move installers you no longer need to the Trash.",
  },
  [RuleId.ChromeCache]: {
    title: "Google Chrome cache",
    whatItIs: "Copies of web pages and images, kept to load sites faster.",
    ifRemoved: "Nothing is lost. You stay signed in; some sites load a little slower at first.",
    howToFreeSpace: "Safe to remove while Chrome is closed.",
  },
  [RuleId.SafariCache]: {
    title: "Safari cache",
    whatItIs: "Copies of web pages and images, kept to load sites faster.",
    ifRemoved: "Nothing is lost. Some sites load a little slower at first.",
    howToFreeSpace: "Safe to remove while Safari is closed.",
  },
  [RuleId.FirefoxCache]: {
    title: "Firefox cache",
    whatItIs: "Copies of web pages and images, kept to load sites faster.",
    ifRemoved: "Nothing is lost. Some sites load a little slower at first.",
    howToFreeSpace: "Safe to remove while Firefox is closed.",
  },
  [RuleId.SlackCache]: {
    title: "Slack cache",
    whatItIs: "Images and files Slack keeps so conversations open quickly.",
    ifRemoved: "Nothing is lost. Slack downloads what it needs again.",
    howToFreeSpace: "Safe to remove while Slack is closed.",
  },
  [RuleId.TeamsCache]: {
    title: "Microsoft Teams cache",
    whatItIs: "Temporary files Teams keeps to load faster.",
    ifRemoved: "Nothing is lost. Teams downloads what it needs again.",
    howToFreeSpace: "Safe to remove while Teams is closed.",
  },
  [RuleId.DiscordCache]: {
    title: "Discord cache",
    whatItIs: "Images and media Discord keeps so chats open quickly.",
    ifRemoved: "Nothing is lost. Discord downloads what it needs again.",
    howToFreeSpace: "Safe to remove while Discord is closed.",
  },
  [RuleId.SpotifyCache]: {
    title: "Spotify cache",
    whatItIs: "Music Spotify keeps temporarily so songs start quickly.",
    ifRemoved:
      "Nothing is lost. Songs download again when you play them; offline playlists may need downloading again.",
    howToFreeSpace: "Safe to remove while Spotify is closed.",
  },
  [RuleId.ApplicationCaches]: {
    title: "Other app caches",
    whatItIs: "Temporary files apps keep to work faster.",
    ifRemoved: "Apps recreate what they need. Some may feel slower the first time.",
    howToFreeSpace: "Close your apps first, then remove them.",
  },
  [RuleId.UserLogs]: {
    title: "App logs",
    whatItIs: "Diagnostic records apps write while they run.",
    ifRemoved: "Nothing you use is lost. Old logs help only when troubleshooting.",
    howToFreeSpace: "Safe to remove at any time.",
  },
  [RuleId.OllamaModels]: {
    title: "Ollama AI models",
    whatItIs: "Large AI models downloaded with Ollama. Each one can take several gigabytes.",
    ifRemoved: "A removed model has to be downloaded again before you can use it.",
    howToFreeSpace:
      'List models with "ollama list" and remove unused ones with "ollama rm <name>".',
  },
  [RuleId.HuggingFaceCache]: {
    title: "Hugging Face model cache",
    whatItIs: "AI models and datasets downloaded by Python tools.",
    ifRemoved: "Tools download the models again the next time they need them.",
    howToFreeSpace: "Move the cache to the Trash, or remove single models you no longer use.",
  },
  [RuleId.LmStudioModels]: {
    title: "LM Studio AI models",
    whatItIs: "Large AI models downloaded with LM Studio.",
    ifRemoved: "A removed model has to be downloaded again before you can use it.",
    howToFreeSpace: "Open LM Studio's model list and delete models you no longer use.",
  },
  [RuleId.SteamGames]: {
    title: "Steam games",
    whatItIs: "Games installed through Steam.",
    ifRemoved: "Removed games must be downloaded again. Cloud saves are usually kept by Steam.",
    howToFreeSpace: "Uninstall games you no longer play from your Steam library.",
  },
  [RuleId.PhotosLibrary]: {
    title: "Photos library",
    whatItIs: "Your photos and videos. Never delete files inside this library by hand.",
    ifRemoved: "Deleting files directly can damage the whole library.",
    howToFreeSpace:
      'In Photos settings, turn on iCloud Photos with "Optimize Mac Storage", or delete photos inside the Photos app.',
  },
  [RuleId.MessagesAttachments]: {
    title: "Messages attachments",
    whatItIs: "Photos, videos and files sent and received in Messages.",
    ifRemoved: "Removed attachments disappear from your conversations.",
    howToFreeSpace:
      'In Messages settings, set "Keep messages" to 1 year. This also deletes older messages, not just attachments. Or review large attachments in System Settings > General > Storage.',
  },
  [RuleId.UtmVirtualMachines]: {
    title: "UTM virtual machines",
    whatItIs:
      "Virtual computers (for example Windows or Linux) that run inside UTM. Each has its own large disk.",
    ifRemoved: "Everything inside a removed virtual machine is lost.",
    howToFreeSpace: "Open UTM and delete virtual machines you no longer use.",
  },
  [RuleId.ParallelsVirtualMachines]: {
    title: "Parallels virtual machines",
    whatItIs: "Virtual computers that run inside Parallels Desktop. Each has its own large disk.",
    ifRemoved: "Everything inside a removed virtual machine is lost.",
    howToFreeSpace: "Open Parallels Desktop and remove virtual machines you no longer use.",
  },
  [RuleId.NotionCache]: {
    title: "Notion cache",
    whatItIs: "Pages and files the Notion app stores so it opens quickly.",
    ifRemoved: "Nothing is lost. Your notes live in Notion's cloud and download again.",
    howToFreeSpace: "Safe to remove while Notion is closed.",
  },
  [RuleId.BunCache]: {
    title: "Bun download cache",
    whatItIs: "JavaScript packages Bun downloaded, kept to speed up installs.",
    ifRemoved: "Nothing is lost. Installs download packages again.",
    howToFreeSpace: "Safe to remove at any time.",
  },
  [RuleId.RustToolchains]: {
    title: "Rust toolchains",
    whatItIs: "Installed versions of the Rust compiler, one folder per version.",
    ifRemoved: "Projects that need a removed version can't build until it is installed again.",
    howToFreeSpace:
      'List versions with "rustup toolchain list" and remove old ones with "rustup toolchain uninstall <name>".',
  },
  [RuleId.GradleWrapper]: {
    title: "Gradle versions",
    whatItIs: "Copies of Gradle that Android and Java projects downloaded for themselves.",
    ifRemoved: "Nothing is lost. A project downloads its Gradle version again when it builds.",
    howToFreeSpace: "Safe to remove when you're not in the middle of a build.",
  },
  [RuleId.AndroidSdk]: {
    title: "Android SDK",
    whatItIs: "Tools, system images and emulators for building Android apps.",
    ifRemoved: "Android Studio can't build or run apps until the parts are installed again.",
    howToFreeSpace:
      "In Android Studio, open the SDK Manager and uninstall platforms and system images you don't use.",
  },
  [RuleId.AppleAerialWallpapers]: {
    title: "Aerial wallpapers and screen savers",
    whatItIs: "Videos macOS downloads for its moving wallpapers and screen savers.",
    ifRemoved: "macOS downloads them again if you choose an aerial wallpaper or screen saver.",
    howToFreeSpace:
      "Choose a still wallpaper and screen saver in System Settings. macOS manages these files itself.",
  },
  [RuleId.InstalledApplications]: {
    title: "Installed apps",
    whatItIs: "The apps in your Applications folder.",
    ifRemoved: "A removed app is gone until you install it again. Your documents are kept.",
    howToFreeSpace:
      "Open Applications in Finder, sort by size, and move apps you no longer use to the Trash.",
  },
  [RuleId.MacOsSystemFiles]: {
    title: "macOS system files",
    whatItIs:
      "The operating system itself, plus downloaded system parts such as simulator runtimes.",
    ifRemoved: "macOS protects these files. Removing them could stop your Mac from working.",
    howToFreeSpace: "Leave these to macOS. Keeping it updated cleans up old system files.",
  },
  [RuleId.VirtualMemoryFiles]: {
    title: "Memory and sleep files",
    whatItIs: "Files macOS uses when memory runs low and to remember open apps while sleeping.",
    ifRemoved: "macOS manages these. They are recreated as needed.",
    howToFreeSpace: "Restart your Mac. Closing apps you're not using also keeps them small.",
  },
  [RuleId.TemporaryFiles]: {
    title: "Temporary files",
    whatItIs: "Short-lived files apps and macOS create while they work.",
    ifRemoved: "Removing them by hand can break apps that are running.",
    howToFreeSpace: "Restart your Mac. macOS clears most temporary files on restart.",
  },
  [RuleId.HomebrewInstallation]: {
    title: "Homebrew programs",
    whatItIs: "Command-line programs and tools installed with Homebrew.",
    ifRemoved: "Programs you remove stop working until you install them again.",
    howToFreeSpace:
      'List programs with "brew list" and remove unused ones with "brew uninstall <name>", then run "brew autoremove".',
  },
  [RuleId.CargoRegistry]: {
    title: "Rust package downloads (Cargo)",
    whatItIs: "Libraries and their source code that Cargo downloaded for Rust projects.",
    ifRemoved: "Nothing is lost. Cargo downloads what a project needs again on the next build.",
    howToFreeSpace: "Safe to remove when you're not in the middle of a build.",
  },
  [RuleId.GoModuleCache]: {
    title: "Go module cache",
    whatItIs: "Libraries downloaded for Go projects.",
    ifRemoved: "Nothing is lost. Go downloads them again on the next build.",
    howToFreeSpace:
      'Run "go clean -modcache". Go makes these files read-only, so use this command instead of deleting them by hand.',
  },
  [RuleId.UvCache]: {
    title: "uv download cache",
    whatItIs: "Python packages that uv downloaded, kept to speed up installs.",
    ifRemoved: "Nothing is lost. Installs download packages again.",
    howToFreeSpace: "Safe to remove at any time.",
  },
  [RuleId.NodeVersionManagerVersions]: {
    title: "Node.js versions (nvm)",
    whatItIs: "Installed versions of Node.js, one folder per version.",
    ifRemoved: "Projects that need a removed version can't run until it is installed again.",
    howToFreeSpace:
      'List versions with "nvm ls" and remove old ones with "nvm uninstall <version>".',
  },
  [RuleId.PyenvPythonVersions]: {
    title: "Python versions (pyenv)",
    whatItIs: "Installed versions of Python, one folder per version.",
    ifRemoved:
      "Projects that need a removed version can't run until it is installed again. Packages installed into that version are lost.",
    howToFreeSpace:
      'List versions with "pyenv versions" and remove old ones with "pyenv uninstall <version>".',
  },
  [RuleId.CondaInstallation]: {
    title: "Conda (Python environments)",
    whatItIs: "Conda and every environment and package it has installed.",
    ifRemoved: "Environments inside it are lost and have to be created again.",
    howToFreeSpace:
      'Run "conda clean --all" to drop downloaded packages, and "conda env remove -n <name>" for environments you no longer use.',
  },
  [RuleId.FlutterPubCache]: {
    title: "Flutter and Dart package cache",
    whatItIs:
      "Packages downloaded for Flutter and Dart projects, plus Dart tools installed globally.",
    ifRemoved:
      "Projects download their packages again. Globally installed Dart tools have to be installed again.",
    howToFreeSpace: 'Run "dart pub cache clean" if you have no global Dart tools you want to keep.',
  },
  [RuleId.AndroidEmulators]: {
    title: "Android emulators",
    whatItIs: "Virtual Android phones and tablets used to test apps. Each has its own disk.",
    ifRemoved: "Apps and data inside a removed emulator are lost.",
    howToFreeSpace:
      "In Android Studio, open the Device Manager and delete emulators you don't use.",
  },
  [RuleId.CoreSimulatorCaches]: {
    title: "iOS simulator caches",
    whatItIs: "Speed-up files the iOS simulators keep for the system parts they run.",
    ifRemoved: "Nothing is lost. They are rebuilt the next time you start a simulator.",
    howToFreeSpace: "Safe to remove while no simulator is running.",
  },
  [RuleId.UnityEditors]: {
    title: "Unity editors",
    whatItIs: "Installed versions of the Unity game editor, one folder per version.",
    ifRemoved: "Projects made with a removed version can't open until it is installed again.",
    howToFreeSpace: "Open Unity Hub, go to Installs, and uninstall versions you no longer use.",
  },
  [RuleId.AdobeMediaCache]: {
    title: "Adobe media cache",
    whatItIs:
      "Preview and audio files that Premiere Pro and After Effects create while you edit video.",
    ifRemoved:
      "Nothing is lost. Adobe apps recreate them, so projects load a little slower at first.",
    howToFreeSpace: "Safe to remove while the Adobe apps are closed.",
  },
  [RuleId.PyTorchCache]: {
    title: "PyTorch model cache",
    whatItIs: "AI models and weights downloaded by Python tools that use PyTorch.",
    ifRemoved: "Tools download the models again the next time they need them.",
    howToFreeSpace: "Move the cache to the Trash, or remove single models you no longer use.",
  },
  [RuleId.ColimaVirtualMachine]: {
    title: "Colima containers",
    whatItIs: "The virtual machine and disk Colima uses to run Docker containers.",
    ifRemoved: "Deleting it by hand would destroy your containers, images and volumes.",
    howToFreeSpace: 'Run "colima stop", or "colima delete" if you no longer need the machine.',
  },
  [RuleId.VirtualBoxVirtualMachines]: {
    title: "VirtualBox virtual machines",
    whatItIs: "Virtual computers that run inside VirtualBox. Each has its own large disk.",
    ifRemoved: "Everything inside a removed virtual machine is lost.",
    howToFreeSpace: "Open VirtualBox and remove virtual machines you no longer use.",
  },
  [RuleId.VmwareFusionVirtualMachines]: {
    title: "VMware Fusion virtual machines",
    whatItIs: "Virtual computers that run inside VMware Fusion. Each has its own large disk.",
    ifRemoved: "Everything inside a removed virtual machine is lost.",
    howToFreeSpace: "Open VMware Fusion and delete virtual machines you no longer use.",
  },
  [RuleId.VagrantBoxes]: {
    title: "Vagrant boxes",
    whatItIs: "Downloaded base images that Vagrant uses to create virtual machines.",
    ifRemoved: "Vagrant downloads a box again the next time a project needs it.",
    howToFreeSpace:
      'List boxes with "vagrant box list" and remove unused ones with "vagrant box remove <name>".',
  },
  [RuleId.MailData]: {
    title: "Mail data",
    whatItIs: "Messages and attachments the Mail app keeps on this Mac.",
    ifRemoved:
      "Deleting files by hand can damage Mail. Messages that exist only on this Mac are lost for good.",
    howToFreeSpace:
      "In Mail, delete large messages and empty the Junk and Trash mailboxes. Account settings can also stop attachments from downloading automatically.",
  },
};
