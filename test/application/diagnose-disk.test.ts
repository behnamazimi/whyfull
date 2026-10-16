import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildRuleIndex,
  DiagnoseDisk,
  DiagnosisUpdateKind,
  type DiagnosisUpdate,
} from "../../src/application/index.ts";
import {
  ByteSize,
  defaultDiagnosisPolicy,
  defaultScanPolicy,
  FindingKind,
  RuleId,
  type Finding,
} from "../../src/domain/index.ts";
import { systemClock } from "../../src/infrastructure/index.ts";
import { createMacOsPlatform } from "../../src/platform/index.ts";
import { pathOf } from "../support/domain-builders.ts";

const FILE_BYTES = 64 * 1024;

const knownRuleIds = (findings: readonly Finding[]): RuleId[] =>
  findings.flatMap((finding) => (finding.kind === FindingKind.KnownItem ? [finding.rule.id] : []));

describe("DiagnoseDisk", () => {
  let home: string;
  let updates: DiagnosisUpdate[];

  beforeAll(async () => {
    home = await mkdtemp(join(tmpdir(), "whyfull-home-"));
    const write = async (...segments: string[]): Promise<void> => {
      const file = join(home, ...segments);
      await mkdir(join(file, ".."), { recursive: true });
      await writeFile(file, Buffer.alloc(FILE_BYTES, 1));
    };
    await write("Library", "Caches", "Homebrew", "wget.tar.gz");
    await write("Library", "Caches", "com.example.app", "cache.db");
    await write("code", "app", "package.json");
    await write("code", "app", "node_modules", "left-pad", "index.js");

    const platform = createMacOsPlatform({ home: pathOf(home), clock: systemClock });
    const index = buildRuleIndex(platform.rulePacks, platform.pathContext);
    if (!index.ok) throw new Error("rule index must build");
    const diagnoseDisk = new DiagnoseDisk({
      scanner: platform.scanner,
      ruleIndex: index.value,
      scanPolicy: defaultScanPolicy,
      diagnosisPolicy: { ...defaultDiagnosisPolicy, minimumFindingSize: ByteSize.zero },
      clock: systemClock,
    });
    updates = [];
    for await (const update of diagnoseDisk.run(pathOf(home))) updates.push(update);
  });

  afterAll(async () => {
    await rm(home, { recursive: true, force: true });
  });

  test("shows findings from known locations before the full scan ends", () => {
    const first = updates.find((update) => update.kind !== DiagnosisUpdateKind.Progress);
    expect(first?.kind).toBe(DiagnosisUpdateKind.PreliminaryFindings);
    expect(
      first?.kind === DiagnosisUpdateKind.PreliminaryFindings && knownRuleIds(first.findings),
    ).toContain(RuleId.HomebrewCache);
  });

  test("ends with a complete diagnosis", () => {
    const last = updates.at(-1);
    if (last?.kind !== DiagnosisUpdateKind.Completed) throw new Error("diagnosis did not complete");
    expect(knownRuleIds(last.report.findings).sort()).toEqual(
      [RuleId.ApplicationCaches, RuleId.HomebrewCache, RuleId.NodeModules].sort(),
    );
    expect(
      last.report.snapshot.root.find(pathOf(join(home, "Library", "Caches", "Homebrew"))),
    ).toBeDefined();
  });
});
