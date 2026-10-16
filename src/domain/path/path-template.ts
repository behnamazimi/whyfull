import { AbsolutePath } from "./absolute-path.ts";

export interface PathContext {
  readonly home: AbsolutePath;
}

export const PathBase = {
  Home: "home",
  Root: "root",
} as const;
export type PathBase = (typeof PathBase)[keyof typeof PathBase];

export class PathTemplate {
  private constructor(
    readonly base: PathBase,
    readonly segments: readonly string[],
  ) {}

  static underHome(...segments: readonly string[]): PathTemplate {
    return new PathTemplate(PathBase.Home, segments);
  }

  static underRoot(...segments: readonly string[]): PathTemplate {
    return new PathTemplate(PathBase.Root, segments);
  }

  resolve(context: PathContext): AbsolutePath {
    const base = this.base === PathBase.Home ? context.home : AbsolutePath.root;
    return this.segments.reduce<AbsolutePath>((path, segment) => path.child(segment), base);
  }
}
