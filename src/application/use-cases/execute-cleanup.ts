import {
  assertNever,
  CleanupActionKind,
  isSameItem,
  OutcomeKind,
  summarizeCleanup,
  type AbsolutePath,
  type ActionResult,
  type ApprovedAction,
  type ByteSize,
  type ApprovedPathAction,
  type CleanupPlan,
  type CleanupReport,
  type Result,
} from "../../domain/index.ts";
import type {
  CleanupFailure,
  CleanupJournal,
  FileInspector,
  FileRemover,
  OwnerTools,
  TrashBin,
} from "../ports/cleanup-ports.ts";
import type { VolumeInfoProvider } from "../ports/volume-info-provider.ts";

export interface ExecuteCleanupDependencies {
  readonly volumes: VolumeInfoProvider;
  readonly files: FileInspector;
  readonly trash: TrashBin;
  readonly remover: FileRemover;
  readonly ownerTools: OwnerTools;
  readonly journal: CleanupJournal;
}

export const CleanupEventKind = {
  ActionFinished: "action-finished",
  Finished: "finished",
} as const;
export type CleanupEventKind = (typeof CleanupEventKind)[keyof typeof CleanupEventKind];

export type CleanupEvent =
  | { readonly kind: typeof CleanupEventKind.ActionFinished; readonly result: ActionResult }
  | { readonly kind: typeof CleanupEventKind.Finished; readonly report: CleanupReport };

export class ExecuteCleanup {
  constructor(private readonly dependencies: ExecuteCleanupDependencies) {}

  async *run(plan: CleanupPlan, volume: AbsolutePath): AsyncGenerator<CleanupEvent> {
    const availableBefore = await this.availableSpace(volume);
    const results: ActionResult[] = [];
    for (const action of plan.actions) {
      const entry = this.dependencies.journal.recordIntent(action);
      const result = await this.perform(action);
      this.dependencies.journal.recordOutcome(entry, result);
      results.push(result);
      yield { kind: CleanupEventKind.ActionFinished, result };
    }
    const availableAfter = await this.availableSpace(volume);
    const gain =
      availableBefore === undefined || availableAfter === undefined
        ? undefined
        : availableAfter.minusOrZero(availableBefore);
    yield { kind: CleanupEventKind.Finished, report: summarizeCleanup(results, gain) };
  }

  private async availableSpace(volume: AbsolutePath): Promise<ByteSize | undefined> {
    const usage = await this.dependencies.volumes.usageOf(volume);
    return usage.ok ? usage.value.available : undefined;
  }

  private async perform(action: ApprovedAction): Promise<ActionResult> {
    if (action.kind !== CleanupActionKind.RunOwnerTool && !(await this.isUnchanged(action))) {
      return { action, outcome: OutcomeKind.SkippedBecauseChanged, detail: undefined };
    }
    const done = await this.execute(action);
    return done.ok
      ? { action, outcome: OutcomeKind.Done, detail: undefined }
      : { action, outcome: OutcomeKind.Failed, detail: done.error.reason };
  }

  private async isUnchanged(action: ApprovedPathAction): Promise<boolean> {
    const current = await this.dependencies.files.identityOf(action.path);
    return current !== undefined && isSameItem(current, action.identity);
  }

  private execute(action: ApprovedAction): Promise<Result<void, CleanupFailure>> {
    switch (action.kind) {
      case CleanupActionKind.Delete:
        return this.dependencies.remover.removeRecursively(action.path);
      case CleanupActionKind.MoveToTrash:
        return this.dependencies.trash.moveToTrash(action.path);
      case CleanupActionKind.RunOwnerTool:
        return this.dependencies.ownerTools.run(action.tool);
      default:
        return assertNever(action);
    }
  }
}
