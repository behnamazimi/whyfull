import type { PathTemplate } from "../path/path-template.ts";
import type { ChildNameMatcher } from "./child-name-matcher.ts";

export const LocatorKind = {
  AtPath: "at-path",
  NamedAnywhere: "named-anywhere",
  AnyDirectory: "any-directory",
  FilesWithExtensionIn: "files-with-extension-in",
  InMatchingChildren: "in-matching-children",
} as const;
export type LocatorKind = (typeof LocatorKind)[keyof typeof LocatorKind];

export type Locator =
  | { readonly kind: typeof LocatorKind.AtPath; readonly paths: readonly PathTemplate[] }
  | { readonly kind: typeof LocatorKind.NamedAnywhere; readonly name: string }
  | { readonly kind: typeof LocatorKind.AnyDirectory }
  | {
      readonly kind: typeof LocatorKind.FilesWithExtensionIn;
      readonly directory: PathTemplate;
      readonly extensions: readonly string[];
    }
  | {
      readonly kind: typeof LocatorKind.InMatchingChildren;
      readonly parent: PathTemplate;
      readonly children: readonly ChildNameMatcher[];
      readonly subfolders: readonly (readonly string[])[];
    };

export const atPath = (...paths: readonly PathTemplate[]): Locator => ({
  kind: LocatorKind.AtPath,
  paths,
});

export const namedAnywhere = (name: string): Locator => ({
  kind: LocatorKind.NamedAnywhere,
  name,
});

export const anyDirectory = (): Locator => ({ kind: LocatorKind.AnyDirectory });

export const filesWithExtensionIn = (
  directory: PathTemplate,
  extensions: readonly string[],
): Locator => ({ kind: LocatorKind.FilesWithExtensionIn, directory, extensions });

export const inMatchingChildren = (
  parent: PathTemplate,
  children: readonly ChildNameMatcher[],
  subfolders: readonly (readonly string[])[],
): Locator => ({ kind: LocatorKind.InMatchingChildren, parent, children, subfolders });
