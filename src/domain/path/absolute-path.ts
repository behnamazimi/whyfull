import { failure, success, type Result } from "../shared/result.ts";

const SEPARATOR = "/";
const CURRENT_DIRECTORY = ".";
const PARENT_DIRECTORY = "..";
const EXTENSION_MARKER = ".";

export const PathError = {
  NotAbsolute: "not-absolute",
  RelativeSegment: "relative-segment",
} as const;
export type PathError = (typeof PathError)[keyof typeof PathError];

const isRelativeSegment = (segment: string): boolean =>
  segment === CURRENT_DIRECTORY || segment === PARENT_DIRECTORY;

export class AbsolutePath {
  static readonly root: AbsolutePath = new AbsolutePath(SEPARATOR);

  private constructor(private readonly value: string) {}

  static parse(raw: string): Result<AbsolutePath, PathError> {
    if (!raw.startsWith(SEPARATOR)) return failure(PathError.NotAbsolute);
    const segments = raw.split(SEPARATOR).filter((segment) => segment.length > 0);
    if (segments.some(isRelativeSegment)) return failure(PathError.RelativeSegment);
    return success(AbsolutePath.fromSegments(segments));
  }

  static fromSegments(segments: readonly string[]): AbsolutePath {
    if (segments.length === 0) return AbsolutePath.root;
    return segments.reduce<AbsolutePath>((path, segment) => path.child(segment), AbsolutePath.root);
  }

  get segments(): readonly string[] {
    return this.isRoot() ? [] : this.value.slice(SEPARATOR.length).split(SEPARATOR);
  }

  get name(): string {
    return this.isRoot() ? SEPARATOR : this.value.slice(this.value.lastIndexOf(SEPARATOR) + 1);
  }

  get extension(): string | undefined {
    const markerIndex = this.name.lastIndexOf(EXTENSION_MARKER);
    const hasStem = markerIndex > 0;
    const hasSuffix = markerIndex < this.name.length - 1;
    return hasStem && hasSuffix ? this.name.slice(markerIndex + 1).toLowerCase() : undefined;
  }

  get parent(): AbsolutePath | undefined {
    if (this.isRoot()) return undefined;
    const separatorIndex = this.value.lastIndexOf(SEPARATOR);
    return separatorIndex === 0
      ? AbsolutePath.root
      : new AbsolutePath(this.value.slice(0, separatorIndex));
  }

  child(name: string): AbsolutePath {
    if (name.length === 0 || name.includes(SEPARATOR) || isRelativeSegment(name)) {
      throw new RangeError(`Not a valid entry name: "${name}"`);
    }
    return new AbsolutePath(this.isRoot() ? SEPARATOR + name : this.value + SEPARATOR + name);
  }

  isRoot(): boolean {
    return this.value === SEPARATOR;
  }

  equals(other: AbsolutePath): boolean {
    return this.value === other.value;
  }

  isInside(ancestor: AbsolutePath): boolean {
    if (ancestor.isRoot()) return !this.isRoot();
    return this.value.startsWith(ancestor.value + SEPARATOR);
  }

  isSameOrInside(ancestor: AbsolutePath): boolean {
    return this.equals(ancestor) || this.isInside(ancestor);
  }

  segmentsBelow(ancestor: AbsolutePath): readonly string[] | undefined {
    if (this.equals(ancestor)) return [];
    if (!this.isInside(ancestor)) return undefined;
    return this.segments.slice(ancestor.segments.length);
  }

  toString(): string {
    return this.value;
  }
}
