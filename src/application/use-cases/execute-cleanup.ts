import {
  assertNever,
  ByteSize,
  CleanupActionKind,
  isSameItem,
  OutcomeKind,
  summarizeCleanup,
  type AbsolutePath,
  type ActionResult,
  type ApprovedAction,
  type ApprovedPathAction,
  type CleanupPlan,
  type CleanupPolicy,
  type CleanupReport,
  type HighRiskAction,
  type ItemIdentity,
  type Result,
} from "../../domain/index.ts";
import type {
  CleanupFailure,
  CleanupJournal,
  FileInspector,
  FileRemover,
  OwnerTools,
  SizeMeter,
  TrashBin,
} from "../ports/cleanup-ports.ts";
import type { VolumeInfoProvider } from "../ports/volume-info-provider.ts";

export interface ExecuteCleanupDependencies {
  readonly volumes: VolumeInfoProvider;
  readonly files: FileInspector;
  readonly trash: TrashBin;
  readonly remover: FileRemover;
  readonly ownerTools: OwnerTools;
  readonly sizeMeter: SizeMeter;
  readonly journal: CleanupJournal;
  readonly policy: CleanupPolicy;
}

type DeleteAction = ApprovedPathAction | HighRiskAction;

const resultOf = (
  action: ApprovedAction,
  outcome: OutcomeKind,
  freed: ByteSize,
  detail?: string,
): ActionResult => ({ action, outcome, freed, detail });

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
    switch (action.kind) {
      case CleanupActionKind.RunOwnerTool:
        return this.settle(action, await this.dependencies.ownerTools.run(action.tool));
      case CleanupActionKind.MoveToTrash:
        if (!(await this.isUnchanged(action.path, action.identity))) return this.skipped(action);
        return this.settle(action, await this.dependencies.trash.moveToTrash(action.path));
      case CleanupActionKind.Delete:
        if (!(await this.isUnchanged(action.path, action.identity))) return this.skipped(action);
        return this.delete(action);
      case CleanupActionKind.DeleteHighRisk:
        if (!(await this.isUnchanged(action.path, action.scannedIdentity))) {
          return this.skipped(action);
        }
        return (await this.grewSinceScan(action)) ? this.skipped(action) : this.delete(action);
      default:
        return assertNever(action);
    }
  }

  private skipped(action: ApprovedAction): ActionResult {
    return resultOf(action, OutcomeKind.SkippedBecauseChanged, ByteSize.zero);
  }

  private settle(action: ApprovedAction, done: Result<void, CleanupFailure>): ActionResult {
    return done.ok
      ? resultOf(action, OutcomeKind.Done, action.size)
      : resultOf(action, OutcomeKind.Failed, ByteSize.zero, done.error.reason);
  }

  private async isUnchanged(path: AbsolutePath, identity: ItemIdentity): Promise<boolean> {
    const current = await this.dependencies.files.identityOf(path);
    return current !== undefined && isSameItem(current, identity);
  }

  private async grewSinceScan(action: HighRiskAction): Promise<boolean> {
    const measured = await this.dependencies.sizeMeter.allocatedSizeOf(action.path);
    if (!measured.ok) return true;
    const allowed = action.size.plus(this.dependencies.policy.highRiskGrowthTolerance);
    return measured.value.isLargerThan(allowed);
  }

  private async delete(action: DeleteAction): Promise<ActionResult> {
    const removed = await this.dependencies.remover.removeRecursively(action.path);
    if (removed.ok) return resultOf(action, OutcomeKind.Done, action.size);
    return this.afterFailedRemoval(action, removed.error.reason);
  }

  // Removing a folder deletes its files one at a time, so an error can leave part of it behind.
  private async afterFailedRemoval(action: DeleteAction, reason: string): Promise<ActionResult> {
    if ((await this.dependencies.files.identityOf(action.path)) === undefined) {
      return resultOf(action, OutcomeKind.Done, action.size);
    }
    const remaining = await this.dependencies.sizeMeter.allocatedSizeOf(action.path);
    const freed = remaining.ok ? action.size.minusOrZero(remaining.value) : ByteSize.zero;
    return freed.isZero()
      ? resultOf(action, OutcomeKind.Failed, ByteSize.zero, reason)
      : resultOf(action, OutcomeKind.PartlyDeleted, freed, reason);
  }
}
