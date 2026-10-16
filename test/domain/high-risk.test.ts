import { describe, expect, test } from "bun:test";
import {
  atPath,
  BlockReason,
  ByteSize,
  CartEntryKind,
  Category,
  checkHighRisk,
  CleanupActionKind,
  classify,
  defaultCleanupPolicy,
  defineRule,
  draftCleanup,
  explainOnly,
  highRiskWarnings,
  HighRiskWarning,
  OutcomeKind,
  PathTemplate,
  RuleId,
  RuleIndex,
  SafetyLevel,
  summarizeCleanup,
  type AbsolutePath,
  type Classification,
  type HighRiskAction,
  type HighRiskEntry,
} from "../../src/domain/index.ts";
import { buildTree, nextIdentity, pathOf, REFERENCE_DATE } from "../support/domain-builders.ts";
import { SAMPLE_HOME } from "../support/report-builder.ts";
import {
  sampleHighRiskLimits,
  sampleProtectedLocations,
} from "../support/sample-high-risk-limits.ts";
import { nodeModulesRule } from "../support/sample-rules.ts";

const GIGABYTE = ByteSize.fromGigabytes(1);
const DAY_MILLISECONDS = 86_400_000;
const LONG_AGO = new Date("2024-01-01T00:00:00Z");
const YESTERDAY = new Date(REFERENCE_DATE.getTime() - DAY_MILLISECONDS);

const photosRule = defineRule({
  id: RuleId.PhotosLibrary,
  category: Category.PhotosAndMessages,
  locator: atPath(PathTemplate.underHome("Work", "Photos")),
  safety: SafetyLevel.Protected,
  remedy: explainOnly(),
});

const classified = (rule: Classification["rule"], path: AbsolutePath): Classification => ({
  rule,
  path,
  size: GIGABYTE,
  lastModified: LONG_AGO,
});

const check = (raw: string, classifications: readonly Classification[] = []) =>
  checkHighRisk({
    target: pathOf(raw),
    limits: sampleHighRiskLimits,
    protectedLocations: sampleProtectedLocations,
    classifications,
  });

describe("checkHighRisk", () => {
  test("allows an unknown folder in the home folder or on an external disk", () => {
    expect(check("/Users/sam/VirtualBox VMs")).toBeUndefined();
    expect(check("/Volumes/Backup/old")).toBeUndefined();
  });

  test("blocks places outside the home folder and external disks", () => {
    expect(check("/Applications/Old.app")?.reason).toBe(BlockReason.OutsideHighRiskArea);
    expect(check("/Users/sam")?.reason).toBe(BlockReason.OutsideHighRiskArea);
    expect(check("/Users/other/files")?.reason).toBe(BlockReason.OutsideHighRiskArea);
  });

  test("blocks synced folders, what's inside them, and what holds them", () => {
    expect(check("/Users/sam/Library/Mobile Documents/notes")?.reason).toBe(
      BlockReason.SyncedFolder,
    );
    expect(check("/Users/sam/Library/CloudStorage")?.reason).toBe(BlockReason.SyncedFolder);
  });

  test("blocks personal libraries and the Trash", () => {
    expect(check("/Users/sam/Library/Mail/V10")?.reason).toBe(BlockReason.PersonalLibrary);
    expect(check("/Users/sam/.ssh")?.reason).toBe(BlockReason.PersonalLibrary);
    expect(check("/Users/sam/.Trash")?.reason).toBe(BlockReason.TheTrash);
    expect(check("/Users/sam/.Trash/old")?.reason).toBe(BlockReason.TheTrash);
  });

  test("blocks anything holding a protected location", () => {
    expect(check("/Users/sam/Documents")?.reason).toBe(BlockReason.Protected);
    expect(check("/Users/sam/Library")?.reason).toBe(BlockReason.SyncedFolder);
  });

  test("blocks a piece of a package but not the whole package", () => {
    expect(check("/Users/sam/Apps/Tool.app/Contents")?.reason).toBe(BlockReason.InsidePackage);
    expect(check("/Users/sam/Apps/Tool.app")).toBeUndefined();
  });

  test("points at the recognized item that holds the target", () => {
    const modules = classified(nodeModulesRule, pathOf("/Users/sam/app/node_modules"));
    expect(check("/Users/sam/app/node_modules/left-pad", [modules])).toEqual({
      reason: BlockReason.InsideRecognizedItem,
      rule: nodeModulesRule,
    });
  });

  test("blocks a folder that holds something whyfull never deletes", () => {
    const photos = classified(photosRule, pathOf("/Users/sam/Work/Photos"));
    expect(check("/Users/sam/Work", [photos])).toEqual({
      reason: BlockReason.ContainsKeptItem,
      rule: photosRule,
    });
  });
});

describe("highRiskWarnings", () => {
  const warningsFor = (raw: string, lastModified: Date, personalFileCount: number) =>
    highRiskWarnings(
      { path: pathOf(raw), lastModified, personalFileCount },
      sampleHighRiskLimits,
      defaultCleanupPolicy,
      REFERENCE_DATE,
    );

  test("says nothing about an old folder without personal files", () => {
    expect(warningsFor("/Users/sam/old", LONG_AGO, 0)).toEqual([]);
  });

  test("warns about recent changes, personal files and app data", () => {
    expect(warningsFor("/Users/sam/Library/Application Support/Tool/x", YESTERDAY, 3)).toEqual([
      HighRiskWarning.RecentlyChanged,
      HighRiskWarning.HasPersonalFiles,
      HighRiskWarning.AppData,
    ]);
  });
});

describe("draftCleanup with high-risk items", () => {
  const root = buildTree(SAMPLE_HOME.toString(), {
    children: [
      { name: "VMs", ownFilesSize: GIGABYTE },
      { name: "Library", children: [{ name: "Mail", ownFilesSize: GIGABYTE }] },
    ],
  });
  const index = RuleIndex.build([], { home: SAMPLE_HOME });
  if (!index.ok) throw new Error("rules must build");
  const classification = classify(root, index.value);

  const entryFor = (raw: string, identity = nextIdentity()): HighRiskEntry => ({
    kind: CartEntryKind.HighRisk,
    path: pathOf(raw),
    size: GIGABYTE,
    fileCount: 1,
    personalFileCount: 0,
    lastModified: LONG_AGO,
    scannedIdentity: identity,
    rule: undefined,
  });
  const draftOf = (entries: readonly HighRiskEntry[]) =>
    draftCleanup({
      entries,
      root,
      classification,
      highRiskLimits: sampleHighRiskLimits,
      protectedLocations: sampleProtectedLocations,
    });

  test("always deletes a high-risk item, never trashes it", () => {
    const draft = draftOf([entryFor("/Users/sam/VMs")]);
    expect(draft.actions.map((action) => action.kind)).toEqual([CleanupActionKind.DeleteHighRisk]);
    expect(draft.blocked).toEqual([]);
  });

  test("blocks an item the scan couldn't identify or that is off limits", () => {
    const unidentified: HighRiskEntry = {
      ...entryFor("/Users/sam/VMs"),
      scannedIdentity: undefined,
    };
    const draft = draftOf([unidentified, entryFor("/Users/sam/Library/Mail")]);
    expect(draft.actions).toEqual([]);
    expect(draft.blocked.map((item) => item.reason)).toEqual([
      BlockReason.ChangedSinceScan,
      BlockReason.PersonalLibrary,
    ]);
  });
});

describe("summarizeCleanup", () => {
  test("counts what a partial deletion freed", () => {
    const action: HighRiskAction = {
      kind: CleanupActionKind.DeleteHighRisk,
      path: pathOf("/Users/sam/VMs"),
      size: GIGABYTE,
      fileCount: 2,
      scannedIdentity: nextIdentity(),
      rule: undefined,
    };
    const half = ByteSize.fromMegabytes(500);
    const report = summarizeCleanup(
      [{ action, outcome: OutcomeKind.PartlyDeleted, detail: "locked", freed: half }],
      undefined,
    );
    expect(report.removedSize).toEqual(half);
    expect(report.highRiskRemovedSize).toEqual(half);
  });
});
