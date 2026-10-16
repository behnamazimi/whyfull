import type { DiagnosisReport } from "../../src/application/index.ts";
import {
  classify,
  defaultDiagnosisPolicy,
  diagnose,
  RuleIndex,
  type DirectoryNode,
} from "../../src/domain/index.ts";
import { pathOf, REFERENCE_DATE } from "./domain-builders.ts";
import { sampleRules } from "./sample-rules.ts";

export const SAMPLE_HOME = pathOf("/Users/sam");

export function reportFor(root: DirectoryNode): DiagnosisReport {
  const index = RuleIndex.build(sampleRules, { home: SAMPLE_HOME });
  if (!index.ok) throw new Error("sample rules must be unique");
  const classification = classify(root, index.value);
  return {
    snapshot: { root, issues: [], startedAt: REFERENCE_DATE, finishedAt: REFERENCE_DATE },
    classification,
    findings: diagnose({
      root,
      classification,
      policy: defaultDiagnosisPolicy,
      now: REFERENCE_DATE,
    }),
  };
}
