export const SafetyLevel = {
  Regenerable: "regenerable",
  SafeViaOwnerTool: "safe-via-owner-tool",
  NeedsReview: "needs-review",
  Protected: "protected",
} as const;
export type SafetyLevel = (typeof SafetyLevel)[keyof typeof SafetyLevel];
