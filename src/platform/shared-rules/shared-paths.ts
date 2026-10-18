import { PathTemplate } from "../../domain/index.ts";

export const SharedPaths = {
  gradleCaches: PathTemplate.underHome(".gradle", "caches"),
  mavenRepository: PathTemplate.underHome(".m2", "repository"),
  huggingFaceCache: PathTemplate.underHome(".cache", "huggingface"),
  ollamaModels: PathTemplate.underHome(".ollama", "models"),
  lmStudioModels: PathTemplate.underHome(".lmstudio", "models"),
  npmCache: PathTemplate.underHome(".npm", "_cacache"),
  bunCache: PathTemplate.underHome(".bun", "install", "cache"),
  rustToolchains: PathTemplate.underHome(".rustup", "toolchains"),
  gradleWrapper: PathTemplate.underHome(".gradle", "wrapper", "dists"),
  cargoRegistry: PathTemplate.underHome(".cargo", "registry"),
  goModuleCache: PathTemplate.underHome("go", "pkg", "mod"),
  uvCache: PathTemplate.underHome(".cache", "uv"),
  nodeVersionManagerVersions: PathTemplate.underHome(".nvm", "versions"),
  pyenvVersions: PathTemplate.underHome(".pyenv", "versions"),
  condaInstallations: [
    PathTemplate.underHome("miniconda3"),
    PathTemplate.underHome("anaconda3"),
    PathTemplate.underHome("miniforge3"),
  ],
  flutterPubCache: PathTemplate.underHome(".pub-cache"),
  androidEmulators: PathTemplate.underHome(".android", "avd"),
  pyTorchCache: PathTemplate.underHome(".cache", "torch"),
  colima: PathTemplate.underHome(".colima"),
  vagrantBoxes: PathTemplate.underHome(".vagrant.d", "boxes"),
} as const;

export const ProjectMarker = {
  NodePackage: "package.json",
  RustCrate: "Cargo.toml",
  PythonVirtualEnvironment: "pyvenv.cfg",
} as const;

export const ProjectFolder = {
  NodeModules: "node_modules",
  PythonBytecodeCache: "__pycache__",
  RustBuildOutput: "target",
  NextJsBuild: ".next",
} as const;

export const PersonalFileExtensions = {
  photos: [
    "jpg",
    "jpeg",
    "png",
    "heic",
    "heif",
    "gif",
    "tif",
    "tiff",
    "dng",
    "raw",
    "cr2",
    "cr3",
    "nef",
    "arw",
  ],
  videos: ["mov", "mp4", "m4v", "avi", "mkv"],
  documents: [
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "pages",
    "numbers",
    "key",
    "rtf",
    "odt",
    "ods",
    "odp",
  ],
} as const;
