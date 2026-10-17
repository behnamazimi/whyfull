import { assertNever } from "../shared/assert-never.ts";

export const ChildNameMatchKind = {
  Exactly: "exactly",
  StartingWith: "starting-with",
} as const;
export type ChildNameMatchKind = (typeof ChildNameMatchKind)[keyof typeof ChildNameMatchKind];

export interface ChildNameMatcher {
  readonly kind: ChildNameMatchKind;
  readonly text: string;
}

export const childNamed = (name: string): ChildNameMatcher => ({
  kind: ChildNameMatchKind.Exactly,
  text: name,
});

export const childStartingWith = (prefix: string): ChildNameMatcher => ({
  kind: ChildNameMatchKind.StartingWith,
  text: prefix,
});

export function matchesChildName(matcher: ChildNameMatcher, name: string): boolean {
  switch (matcher.kind) {
    case ChildNameMatchKind.Exactly:
      return name === matcher.text;
    case ChildNameMatchKind.StartingWith:
      return name.startsWith(matcher.text);
    default:
      return assertNever(matcher.kind);
  }
}
