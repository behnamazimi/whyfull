import { chmod, link, mkdir, mkdtemp, open, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const FIXTURE_REGULAR_FILE_BYTES = 256 * 1024;
export const FIXTURE_NOTABLE_FILE_BYTES = 2 * 1024 * 1024;
export const FIXTURE_NOTABLE_THRESHOLD_BYTES = 1024 * 1024;
export const FIXTURE_SPARSE_LOGICAL_BYTES = 1024 * 1024 * 1024;
const LOCKED_MODE = 0o000;
const UNLOCKED_MODE = 0o755;

export const FixtureEntry = {
  Documents: "documents",
  Report: "report.bin",
  ReportHardLink: "report-link.bin",
  Sparse: "sparse",
  SparseImage: "disk.img",
  Loop: "loop",
  LoopLink: "back",
  Locked: "locked",
  Project: "project",
  ProjectManifest: "package.json",
  Dependencies: "node_modules",
  Media: "media",
  BigFile: "big.bin",
  Photo: "holiday.jpg",
} as const;

export interface FixtureTree {
  readonly root: string;
  remove(): Promise<void>;
}

export async function createFixtureTree(): Promise<FixtureTree> {
  const root = await mkdtemp(join(tmpdir(), "whyfull-fixture-"));
  const at = (...segments: string[]): string => join(root, ...segments);

  await mkdir(at(FixtureEntry.Documents));
  await writeFile(
    at(FixtureEntry.Documents, FixtureEntry.Report),
    Buffer.alloc(FIXTURE_REGULAR_FILE_BYTES, 1),
  );
  await link(
    at(FixtureEntry.Documents, FixtureEntry.Report),
    at(FixtureEntry.Documents, FixtureEntry.ReportHardLink),
  );

  await mkdir(at(FixtureEntry.Sparse));
  const sparse = await open(at(FixtureEntry.Sparse, FixtureEntry.SparseImage), "w");
  await sparse.truncate(FIXTURE_SPARSE_LOGICAL_BYTES);
  await sparse.close();

  await mkdir(at(FixtureEntry.Loop));
  await symlink("..", at(FixtureEntry.Loop, FixtureEntry.LoopLink));

  await mkdir(at(FixtureEntry.Locked));
  await writeFile(
    at(FixtureEntry.Locked, "secret.bin"),
    Buffer.alloc(FIXTURE_REGULAR_FILE_BYTES, 1),
  );
  await chmod(at(FixtureEntry.Locked), LOCKED_MODE);

  await mkdir(at(FixtureEntry.Project, FixtureEntry.Dependencies), { recursive: true });
  await writeFile(at(FixtureEntry.Project, FixtureEntry.ProjectManifest), "{}");
  await writeFile(at(FixtureEntry.Project, FixtureEntry.Dependencies, "lib.js"), "export {};");

  await mkdir(at(FixtureEntry.Media));
  await writeFile(
    at(FixtureEntry.Media, FixtureEntry.BigFile),
    Buffer.alloc(FIXTURE_NOTABLE_FILE_BYTES, 1),
  );
  await writeFile(at(FixtureEntry.Media, FixtureEntry.Photo), "jpeg");

  return {
    root,
    async remove() {
      await chmod(at(FixtureEntry.Locked), UNLOCKED_MODE);
      await rm(root, { recursive: true, force: true });
    },
  };
}
