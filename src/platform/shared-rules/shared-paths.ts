import { PathTemplate } from "../../domain/index.ts";

export const SharedPaths = {
  gradleCaches: PathTemplate.underHome(".gradle", "caches"),
  mavenRepository: PathTemplate.underHome(".m2", "repository"),
  huggingFaceCache: PathTemplate.underHome(".cache", "huggingface"),
  ollamaModels: PathTemplate.underHome(".ollama", "models"),
  lmStudioModels: PathTemplate.underHome(".lmstudio", "models"),
  npmCache: PathTemplate.underHome(".npm"),
  bunCache: PathTemplate.underHome(".bun", "install", "cache"),
  rustToolchains: PathTemplate.underHome(".rustup", "toolchains"),
  gradleWrapper: PathTemplate.underHome(".gradle", "wrapper", "dists"),
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
