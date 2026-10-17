import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CartEntryKind,
  OutcomeKind,
  RuleId,
  SafetyLevel,
  type RuleId as RuleIdentifier,
} from "../../src/domain/index.ts";
import { cleanUp, scanned } from "../support/cleanup-harness.ts";

const SUPPORT = join("Library", "Application Support");
const CACHE_FILE = "data_0";
const KEPT_FILE = "keep.txt";
const VS_CODE_PROCESS = "Code";

let home: string;

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "whyfull-app-cache-"));
});

afterEach(async () => {
  await rm(home, { recursive: true, force: true });
});

async function file(...segments: string[]): Promise<void> {
  const path = join(home, ...segments);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, "x");
}

async function exists(...segments: string[]): Promise<boolean> {
  const name = segments[segments.length - 1] ?? "";
  const folder = join(home, ...segments.slice(0, -1));
  return (await readdir(folder).catch((): string[] => [])).includes(name);
}

async function cleanItemsOf(id: RuleIdentifier, runningApps: string[] = []) {
  const { platform, report } = await scanned(home);
  const items = report.classification.classifications.filter((item) => item.rule.id === id);
  const entries = items.map((item) => ({
    kind: CartEntryKind.Recognized,
    path: item.path,
    rule: item.rule,
    size: item.size,
  }));
  const outcomes = await cleanUp(platform, report, entries, home, undefined, runningApps);
  return { items, outcomes };
}

describe("app cache cleanup", () => {
  test("removes VS Code caches and keeps settings and unsaved files", async () => {
    await file(SUPPORT, "Code", "Cache", CACHE_FILE);
    await file(SUPPORT, "Code", "CachedData", CACHE_FILE);
    await file(SUPPORT, "Code", "User", "settings.json");
    await file(SUPPORT, "Code", "Backups", KEPT_FILE);

    const { outcomes } = await cleanItemsOf(RuleId.VsCodeCaches);

    expect(outcomes).toEqual([OutcomeKind.Done, OutcomeKind.Done]);
    expect((await readdir(join(home, SUPPORT, "Code"))).sort()).toEqual(["Backups", "User"]);
  });

  test("removes browser caches in every profile and keeps history and cookies", async () => {
    const chrome = join(SUPPORT, "Google", "Chrome");
    await file(chrome, "Default", "Cache", CACHE_FILE);
    await file(chrome, "Default", "Service Worker", "CacheStorage", CACHE_FILE);
    await file(chrome, "Default", "History");
    await file(chrome, "Profile 1", "Code Cache", CACHE_FILE);
    await file(chrome, "Profile 1", "Cookies");
    await file(chrome, "Default", "Extensions", KEPT_FILE);

    const { items, outcomes } = await cleanItemsOf(RuleId.ChromeProfileCaches);

    expect(items).toHaveLength(3);
    expect(outcomes).toEqual([OutcomeKind.Done, OutcomeKind.Done, OutcomeKind.Done]);
    expect(await exists(chrome, "Default", "Cache")).toBe(false);
    expect(await exists(chrome, "Profile 1", "Code Cache")).toBe(false);
    expect(await exists(chrome, "Default", "History")).toBe(true);
    expect(await exists(chrome, "Profile 1", "Cookies")).toBe(true);
    expect(await exists(chrome, "Default", "Extensions")).toBe(true);
  });

  test("never removes Google Drive offline data next to the browser caches", async () => {
    await file(SUPPORT, "Google", "Chrome", "Default", "Cache", CACHE_FILE);
    await file(SUPPORT, "Google", "DriveFS", "unsynced.docx");

    const { items, outcomes } = await cleanItemsOf(RuleId.GoogleDriveOfflineData);

    expect(items.map((item) => item.rule.safety)).toEqual([SafetyLevel.Protected]);
    expect(outcomes).not.toContain(OutcomeKind.Done);
    expect(await exists(SUPPORT, "Google", "DriveFS", "unsynced.docx")).toBe(true);
  });

  test("leaves the cache alone while its app is open", async () => {
    await file(SUPPORT, "Code", "Cache", CACHE_FILE);

    const { items, outcomes } = await cleanItemsOf(RuleId.VsCodeCaches, [VS_CODE_PROCESS]);

    expect(items).toHaveLength(1);
    expect(outcomes).not.toContain(OutcomeKind.Done);
    expect(await exists(SUPPORT, "Code", "Cache")).toBe(true);
  });
});
