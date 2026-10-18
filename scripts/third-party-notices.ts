// Writes the license notices of every package compiled into the whyfull binary.
//
//   bun scripts/third-party-notices.ts <output file>
//
// The binary bundles these packages and OpenTUI's native library (which includes libwebp, Wuffs,
// lcms2, stb and Ghostty code). Their licenses ask that the notices travel with the binary.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const ROOT = join(import.meta.dir, "..");
const NODE_MODULES = join(ROOT, "node_modules");
// Only the macOS builds of OpenTUI's native library end up in whyfull's binaries.
const SHIPPED_OPTIONAL = "-darwin-";
const NOTICE_FILE = /^(licen[cs]e|copying|notice|patents|authors)/i;
const SEPARATOR_WIDTH = 78;
const SEPARATOR = `\n${"=".repeat(SEPARATOR_WIDTH)}\n`;

const manifestSchema = z.object({
  name: z.string(),
  version: z.string(),
  license: z.string().optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  optionalDependencies: z.record(z.string(), z.string()).optional(),
});
type Manifest = z.infer<typeof manifestSchema>;

function readManifest(directory: string): Manifest | undefined {
  let text: string;
  try {
    text = readFileSync(join(directory, "package.json"), "utf8");
  } catch {
    return undefined;
  }
  return manifestSchema.parse(JSON.parse(text));
}

const [, , output] = process.argv;
if (output === undefined)
  throw new Error("Usage: bun scripts/third-party-notices.ts <output file>");

const root = readManifest(ROOT);
if (root === undefined) throw new Error("package.json is missing");

const found = new Map<string, Manifest>();
function visit(name: string, optional: boolean): void {
  if (found.has(name)) return;
  const manifest = readManifest(join(NODE_MODULES, name));
  if (manifest === undefined) {
    if (optional) return;
    throw new Error(`${name} is not installed. Run bun install first.`);
  }
  found.set(name, manifest);
  for (const dependency of Object.keys(manifest.dependencies ?? {})) visit(dependency, false);
  for (const dependency of Object.keys(manifest.optionalDependencies ?? {})) {
    if (dependency.includes(SHIPPED_OPTIONAL)) visit(dependency, true);
  }
}
for (const dependency of Object.keys(root.dependencies ?? {})) visit(dependency, false);

const sections = [...found.values()]
  .sort((left, right) => left.name.localeCompare(right.name))
  .map((manifest) => {
    const directory = join(NODE_MODULES, manifest.name);
    const notices = readdirSync(directory)
      .filter((file) => NOTICE_FILE.test(file))
      .sort()
      .map((file) => `--- ${file} ---\n${readFileSync(join(directory, file), "utf8").trim()}`);
    const heading = `${manifest.name} ${manifest.version} (${manifest.license ?? "see below"})`;
    return [heading, ...notices].join("\n\n");
  });

writeFileSync(
  output,
  [
    `Third-party software in whyfull ${root.version}`,
    "whyfull itself is MIT licensed; see LICENSE.",
    ...sections,
  ].join(SEPARATOR) + "\n",
);
console.log(`Wrote notices for ${String(found.size)} packages to ${output}`);
