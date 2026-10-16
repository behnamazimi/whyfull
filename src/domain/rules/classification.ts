import type { AbsolutePath } from "../path/absolute-path.ts";
import { ByteSize } from "../size/byte-size.ts";
import type { DirectoryNode } from "../scan/directory-node.ts";
import type { Rule } from "./rule.ts";
import { RuleScope } from "./rule.ts";
import type { RuleIndex } from "./rule-index.ts";

export interface Classification {
  readonly rule: Rule;
  readonly path: AbsolutePath;
  readonly size: ByteSize;
  readonly lastModified: Date;
}

export interface ClassificationResult {
  readonly classifications: readonly Classification[];
  unclassifiedSizeOf(directory: DirectoryNode): ByteSize;
}

class Classifier {
  readonly classifications: Classification[] = [];
  private readonly classifiedBytesOutsideRules = new Map<DirectoryNode, ByteSize>();

  constructor(private readonly index: RuleIndex) {}

  unclassifiedSizeOf(directory: DirectoryNode): ByteSize {
    const classified = this.classifiedBytesOutsideRules.get(directory);
    return classified === undefined ? ByteSize.zero : directory.totalSize.minusOrZero(classified);
  }

  visit(directory: DirectoryNode, parent: DirectoryNode | undefined, enclosing?: Rule): ByteSize {
    const rule = this.index.ruleForDirectory(directory, parent);
    const startsNewClassification = rule !== undefined && rule.id !== enclosing?.id;
    return startsNewClassification
      ? this.classifyDirectory(directory, rule)
      : this.visitContents(directory, enclosing);
  }

  private classifyDirectory(directory: DirectoryNode, rule: Rule): ByteSize {
    const carvedOutByMoreSpecificRules =
      rule.scope === RuleScope.RemainderAfterMoreSpecificRules
        ? this.visitContents(directory, rule)
        : ByteSize.zero;
    this.classifications.push({
      rule,
      path: directory.path,
      size: directory.totalSize.minusOrZero(carvedOutByMoreSpecificRules),
      lastModified: directory.lastModified,
    });
    return directory.totalSize;
  }

  private visitContents(directory: DirectoryNode, enclosing: Rule | undefined): ByteSize {
    let classified = ByteSize.zero;
    for (const child of directory.children) {
      classified = classified.plus(this.visit(child, directory, enclosing));
    }
    for (const file of directory.notableFiles) {
      const rule = this.index.ruleForFile(file);
      if (rule === undefined || rule.id === enclosing?.id) continue;
      this.classifications.push({
        rule,
        path: file.path,
        size: file.size,
        lastModified: file.lastModified,
      });
      classified = classified.plus(file.size);
    }
    if (enclosing === undefined) this.classifiedBytesOutsideRules.set(directory, classified);
    return classified;
  }
}

export function classify(root: DirectoryNode, index: RuleIndex): ClassificationResult {
  const classifier = new Classifier(index);
  classifier.visit(root, undefined);
  return {
    classifications: classifier.classifications,
    unclassifiedSizeOf: (directory) => classifier.unclassifiedSizeOf(directory),
  };
}
