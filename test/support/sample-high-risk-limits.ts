import type { AbsolutePath, HighRiskLimits } from "../../src/domain/index.ts";
import { pathOf } from "./domain-builders.ts";
import { SAMPLE_HOME } from "./report-builder.ts";

const inHome = (...segments: string[]): AbsolutePath =>
  segments.reduce((path, segment) => path.child(segment), SAMPLE_HOME);

export const sampleHighRiskLimits: HighRiskLimits = {
  areas: [SAMPLE_HOME, pathOf("/Volumes")],
  syncedFolders: [inHome("Library", "Mobile Documents"), inHome("Library", "CloudStorage")],
  personalLibraries: [
    inHome("Pictures", "Photos Library.photoslibrary"),
    inHome("Library", "Mail"),
    inHome(".ssh"),
  ],
  theTrash: inHome(".Trash"),
  appData: inHome("Library"),
  packageExtensions: new Set(["app", "photoslibrary"]),
};

export const sampleProtectedLocations: readonly AbsolutePath[] = [
  SAMPLE_HOME,
  inHome("Documents"),
  inHome("Library"),
  inHome("Library", "Application Support"),
];
