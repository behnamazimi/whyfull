import type { AbsolutePath } from "../path/absolute-path.ts";
import type { PathContext } from "../path/path-template.ts";
import type { DirectoryNode } from "../scan/directory-node.ts";
import type { NotableFile } from "../scan/notable-file.ts";
import { assertNever } from "../shared/assert-never.ts";
import { failure, success, type Result } from "../shared/result.ts";
import { LocatorKind } from "./locator.ts";
import type { Rule } from "./rule.ts";
import type { RuleId } from "./rule-id.ts";

export interface DuplicateRuleError {
  readonly duplicateId: RuleId;
}

export interface Hotspot {
  readonly rule: Rule;
  readonly path: AbsolutePath;
}

type RulesByKey = Map<string, Rule[]>;

const addTo = (index: RulesByKey, key: string, rule: Rule): void => {
  const existing = index.get(key);
  if (existing === undefined) index.set(key, [rule]);
  else existing.push(rule);
};

const firstDuplicateId = (rules: readonly Rule[]): RuleId | undefined => {
  const seen = new Set<RuleId>();
  for (const rule of rules) {
    if (seen.has(rule.id)) return rule.id;
    seen.add(rule.id);
  }
  return undefined;
};

export class RuleIndex {
  private readonly byPath: RulesByKey = new Map();
  private readonly byName: RulesByKey = new Map();
  private readonly byExtensionDirectory: RulesByKey = new Map();
  private readonly onAnyDirectory: Rule[] = [];
  private readonly hotspotList: Hotspot[] = [];
  readonly markerFileNames: ReadonlySet<string>;

  private constructor(rules: readonly Rule[], context: PathContext) {
    for (const rule of rules) this.register(rule, context);
    this.markerFileNames = new Set(
      rules.flatMap((rule) =>
        rule.conditions.flatMap((condition) => condition.requiredMarkerFiles),
      ),
    );
  }

  static build(
    rules: readonly Rule[],
    context: PathContext,
  ): Result<RuleIndex, DuplicateRuleError> {
    const duplicateId = firstDuplicateId(rules);
    if (duplicateId !== undefined) return failure({ duplicateId });
    return success(new RuleIndex(rules, context));
  }

  get hotspots(): readonly Hotspot[] {
    return this.hotspotList;
  }

  ruleForDirectory(directory: DirectoryNode, parent: DirectoryNode | undefined): Rule | undefined {
    const candidates = [
      ...(this.byPath.get(directory.path.toString()) ?? []),
      ...(this.byName.get(directory.name) ?? []),
      ...this.onAnyDirectory,
    ];
    return candidates.find((rule) =>
      rule.conditions.every((condition) => condition.isSatisfiedBy({ directory, parent })),
    );
  }

  ruleForFile(file: NotableFile): Rule | undefined {
    const atExactPath = this.byPath.get(file.path.toString())?.[0];
    if (atExactPath !== undefined) return atExactPath;
    const directory = file.path.parent;
    const extension = file.path.extension;
    if (directory === undefined || extension === undefined) return undefined;
    return this.byExtensionDirectory
      .get(directory.toString())
      ?.find(
        (rule) =>
          rule.locator.kind === LocatorKind.FilesWithExtensionIn &&
          rule.locator.extensions.includes(extension),
      );
  }

  private register(rule: Rule, context: PathContext): void {
    const { locator } = rule;
    switch (locator.kind) {
      case LocatorKind.AtPath:
        for (const template of locator.paths) {
          const path = template.resolve(context);
          addTo(this.byPath, path.toString(), rule);
          this.hotspotList.push({ rule, path });
        }
        return;
      case LocatorKind.NamedAnywhere:
        addTo(this.byName, locator.name, rule);
        return;
      case LocatorKind.AnyDirectory:
        this.onAnyDirectory.push(rule);
        return;
      case LocatorKind.FilesWithExtensionIn:
        addTo(this.byExtensionDirectory, locator.directory.resolve(context).toString(), rule);
        return;
      default:
        assertNever(locator);
    }
  }
}
