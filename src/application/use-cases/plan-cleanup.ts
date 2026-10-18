import {
  assertNever,
  BlockReason,
  CleanupActionKind,
  isSameItem,
  ProbeProblem,
  runningOwnerApp,
  type AbsolutePath,
  type ApprovedAction,
  type BlockedItem,
  type CleanupAction,
  type CleanupDraft,
  type CleanupPlan,
  type HighRiskAction,
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

type Guard<Subject> = (subject: Subject, context: GuardContext) => Verdict | undefined;

interface Located {
  readonly path: AbsolutePath;
}

const verdict = (reason: BlockReason, detail?: string): Verdict => ({ reason, detail });

const isProtectedLocation: Guard<Located> = (action, { dependencies }) =>
  dependencies.protectedLocations.some((location) => location.isSameOrInside(action.path))
    ? verdict(BlockReason.Protected)
    : undefined;

const isOutsideScanRoot: Guard<Located> = (action, { scanRoot }) =>
  action.path.isInside(scanRoot) ? undefined : verdict(BlockReason.OutsideScanRoot);

const ownerAppIsRunning = (
  rules: readonly Rule[],
  runningApps: ReadonlySet<string>,
): Verdict | undefined => {
  const runningApp = runningOwnerApp(rules, runningApps);
  return runningApp === undefined ? undefined : verdict(BlockReason.AppRunning, runningApp);
};

const locationGuards: readonly Guard<Located>[] = [isProtectedLocation, isOutsideScanRoot];

const pathGuards: readonly Guard<PathAction>[] = [
  ...locationGuards,
  (action, { runningApps }) => ownerAppIsRunning([action.rule], runningApps),
];

const toolGuards: readonly Guard<OwnerToolAction>[] = [
  (action, { runningApps }) => ownerAppIsRunning(action.rules, runningApps),
];

const blockReasonOfProblem: Readonly<Record<ProbeProblem, BlockReason>> = {
  [ProbeProblem.NotInstalled]: BlockReason.ToolMissing,
  [ProbeProblem.Unusable]: BlockReason.ToolUnusable,
  [ProbeProblem.NotRunning]: BlockReason.ToolNotRunning,
  [ProbeProblem.NotResponding]: BlockReason.ToolNotResponding,
  [ProbeProblem.WrongEngine]: BlockReason.ToolWrongEngine,
};

const firstVerdict = <Subject>(
  guards: readonly Guard<Subject>[],
  subject: Subject,
  context: GuardContext,
): Verdict | undefined => {
  for (const guard of guards) {
    const found = guard(subject, context);
    if (found !== undefined) return found;
  }
  return undefined;
};

function blockedFrom(action: CleanupAction, found: Verdict): BlockedItem {
  switch (action.kind) {
    case CleanupActionKind.RunOwnerTool:
      return { paths: action.paths, rule: action.rules[0], size: action.size, ...found };
    case CleanupActionKind.Delete:
    case CleanupActionKind.MoveToTrash:
    case CleanupActionKind.EmptyTrash:
    case CleanupActionKind.DeleteHighRisk:
      return { paths: [action.path], rule: action.rule, size: action.size, ...found };
    default:
      return assertNever(action);
  }
}

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
    switch (action.kind) {
      case CleanupActionKind.RunOwnerTool:
        return (
          (await this.toolVerdict(action)) ?? firstVerdict(toolGuards, action, context) ?? action
        );
      case CleanupActionKind.DeleteHighRisk:
        return this.decideHighRisk(action, context);
      case CleanupActionKind.Delete:
      case CleanupActionKind.MoveToTrash:
      case CleanupActionKind.EmptyTrash:
        return this.decidePath(action, context);
      default:
        return assertNever(action);
    }
  }

  private async toolVerdict(action: OwnerToolAction): Promise<Verdict | undefined> {
    const { ownerTools } = this.dependencies;
    const readiness = await ownerTools.check(action.tool);
    return readiness.ready
      ? undefined
      : verdict(blockReasonOfProblem[readiness.problem], ownerTools.describe(action.tool));
  }

  private async decidePath(
    action: PathAction,
    context: GuardContext,
  ): Promise<ApprovedAction | Verdict> {
    const found = firstVerdict(pathGuards, action, context);
    if (found !== undefined) return found;
    const identity = await this.dependencies.files.identityOf(action.path);
    if (identity === undefined || identity.isSymbolicLink) {
      return verdict(BlockReason.ChangedSinceScan);
    }
    return { ...action, identity };
  }

  // A high-risk item is checked against what the scan saw, not against this moment,
  // because the person decided based on the scan.
  private async decideHighRisk(
    action: HighRiskAction,
    context: GuardContext,
  ): Promise<ApprovedAction | Verdict> {
    const found = firstVerdict(locationGuards, action, context);
    if (found !== undefined) return found;
    const identity = await this.dependencies.files.identityOf(action.path);
    if (identity === undefined || !isSameItem(identity, action.scannedIdentity)) {
      return verdict(BlockReason.ChangedSinceScan);
    }
    return action;
  }
}
