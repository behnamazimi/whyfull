import { describe, expect, test } from "bun:test";
import {
  ByteSize,
  CartEntryKind,
  outcomeOfCart,
  type CartEntry,
  type HighRiskEntry,
  type RecognizedEntry,
} from "../../src/domain/index.ts";
import { pathOf, REFERENCE_DATE } from "../support/domain-builders.ts";
import {
  applicationCachesRule,
  homebrewOwnerToolRule,
  installersRule,
} from "../support/sample-rules.ts";

const GIGABYTE = ByteSize.fromGigabytes(1);
const CACHE_GIGABYTES = 2;
const INSTALLER_GIGABYTES = 3;
const TOOL_GIGABYTES = 4;
const HIGH_RISK_GIGABYTES = 5;
const FILE_COUNT = 10;

const recognized = (rule: RecognizedEntry["rule"], gigabytes: number): RecognizedEntry => ({
  kind: CartEntryKind.Recognized,
  path: pathOf(`/Users/sam/${rule.id}`),
  rule,
  size: ByteSize.fromGigabytes(gigabytes),
});

const highRisk: HighRiskEntry = {
  kind: CartEntryKind.HighRisk,
  path: pathOf("/Users/sam/mystery"),
  size: ByteSize.fromGigabytes(HIGH_RISK_GIGABYTES),
  fileCount: FILE_COUNT,
  personalFileCount: 0,
  lastModified: REFERENCE_DATE,
  scannedIdentity: undefined,
  rule: undefined,
};

describe("outcomeOfCart", () => {
  test("an empty cart does nothing", () => {
    const outcome = outcomeOfCart([]);
    expect(outcome.freesNow.isZero()).toBe(true);
    expect(outcome.toTrash.isZero()).toBe(true);
    expect(outcome.viaTools.isZero()).toBe(true);
  });

  test("splits space that comes back now from the Trash and from tools", () => {
    const entries: CartEntry[] = [
      recognized(applicationCachesRule, CACHE_GIGABYTES),
      recognized(installersRule, INSTALLER_GIGABYTES),
      recognized(homebrewOwnerToolRule, TOOL_GIGABYTES),
    ];
    const outcome = outcomeOfCart(entries);
    expect(outcome.freesNow.equals(ByteSize.fromGigabytes(CACHE_GIGABYTES))).toBe(true);
    expect(outcome.toTrash.equals(ByteSize.fromGigabytes(INSTALLER_GIGABYTES))).toBe(true);
    expect(outcome.viaTools.equals(ByteSize.fromGigabytes(TOOL_GIGABYTES))).toBe(true);
  });

  test("high-risk items are deleted outright, so they free space now", () => {
    const outcome = outcomeOfCart([recognized(applicationCachesRule, 1), highRisk]);
    expect(
      outcome.freesNow.equals(GIGABYTE.plus(ByteSize.fromGigabytes(HIGH_RISK_GIGABYTES))),
    ).toBe(true);
  });
});
