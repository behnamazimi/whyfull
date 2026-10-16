import {
  BlockReason,
  CleanupActionKind,
  type AbsolutePath,
  type ApprovedAction,
  type BlockedItem,
  type CleanupAction,
  type CleanupDraft,
  type CleanupPlan,
  type OwnerToolAction,
  type PathAction,
  type Rule,
} from "../../domain/index.ts";
import type { AppActivity, FileInspector, OwnerTools } from "../ports/cleanup-ports.ts";

export interface PlanCleanupDependencies {
  readonly files: FileInspector;
  readonly apps: AppActivity;
  readonly ownerTools: OwnerTools;
  readonly protectedLocations: readonly AbsolutePath[];
}

interface GuardContext {
  readonly scanRoot: AbsolutePath;
  readonly runningApps: ReadonlySet<string>;
  readonly dependencies: PlanCleanupDependencies;
}

interface Verdict {
  readonly reason: BlockReason;
  readonly detail: string | undefined;
}

type Guard<Action extends CleanupAction> = (
  action: Action,
  context: GuardContext,
) => Verdict | undefined;

const verdict = (reason: BlockReason, detail?: string): Verdict => ({ reason, detail });

const isProtectedLocation: Guard<PathAction> = (action, { dependencies }) =>
  dependencies.protectedLocations.some((location) => location.isSameOrInside(action.path))
    ? verdict(BlockReason.Protected)
    : undefined;

const isOutsideScanRoot: Guard<PathAction> = (action, { scanRoot }) =>
  action.path.isInside(scanRoot) ? undefined : verdict(BlockReason.OutsideScanRoot);

const ownerAppIsRunning = (
  rules: readonly Rule[],
  runningApps: ReadonlySet<string>,
): Verdict | undefined => {
  const runningApp = rules.flatMap((rule) => rule.ownerApps).find((app) => runningApps.has(app));
  return runningApp === undefined ? undefined : verdict(BlockReason.AppRunning, runningApp);
};

const pathGuards: readonly Guard<PathAction>[] = [
  isProtectedLocation,
  isOutsideScanRoot,
  (action, { runningApps }) => ownerAppIsRunning([action.rule], runningApps),
];

const toolGuards: readonly Guard<OwnerToolAction>[] = [
  (action, { dependencies }) =>
    dependencies.ownerTools.isAvailable(action.tool)
      ? undefined
      : verdict(BlockReason.ToolMissing, dependencies.ownerTools.describe(action.tool)),
  (action, { runningApps }) => ownerAppIsRunning(action.rules, runningApps),
];

const firstVerdict = <Action extends CleanupAction>(
  guards: readonly Guard<Action>[],
  action: Action,
  context: GuardContext,
): Verdict | undefined => {
  for (const guard of guards) {
    const found = guard(action, context);
    if (found !== undefined) return found;
  }
  return undefined;
};

const blockedFrom = (action: CleanupAction, found: Verdict): BlockedItem =>
  action.kind === CleanupActionKind.RunOwnerTool
    ? { paths: action.paths, rule: action.rules[0], size: action.size, ...found }
    : { paths: [action.path], rule: action.rule, size: action.size, ...found };

export class PlanCleanup {
  constructor(private readonly dependencies: PlanCleanupDependencies) {}

  async plan(draft: CleanupDraft, scanRoot: AbsolutePath): Promise<CleanupPlan> {
    const context: GuardContext = {
      scanRoot,
      runningApps: await this.dependencies.apps.runningAppNames(),
      dependencies: this.dependencies,
    };
    const approved: ApprovedAction[] = [];
    const blocked: BlockedItem[] = [...draft.blocked];
    for (const action of draft.actions) {
      const decision = await this.decide(action, context);
      if ("reason" in decision) blocked.push(blockedFrom(action, decision));
      else approved.push(decision);
    }
    return { actions: approved, blocked };
  }

  private async decide(
    action: CleanupAction,
    context: GuardContext,
  ): Promise<ApprovedAction | Verdict> {
    if (action.kind === CleanupActionKind.RunOwnerTool) {
      return firstVerdict(toolGuards, action, context) ?? action;
    }
    const found = firstVerdict(pathGuards, action, context);
    if (found !== undefined) return found;
    const identity = await this.dependencies.files.identityOf(action.path);
    if (identity === undefined || identity.isSymbolicLink) {
      return verdict(BlockReason.ChangedSinceScan);
    }
    return { ...action, identity };
  }
}
