import { ByteSize, ChangeDirection, type SnapshotDiff } from "../../../domain/index.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatAge } from "../../format/age-format.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatPath } from "../../format/path-format.ts";
import type { AppState } from "../state/app-state.ts";
import { ScreenKind } from "../state/screen.ts";
import { padSize, sizeBar } from "./layout.ts";

export interface GrowthRow {
  readonly path: string;
  readonly growth: string;
  readonly bar: string;
  readonly detail: string;
}

export interface GrowthView {
  readonly kind: typeof ScreenKind.Growth;
  readonly title: string;
  readonly summary: string;
  readonly rows: readonly GrowthRow[];
}

export const hasGrowthNews = (diff: SnapshotDiff): boolean =>
  diff.total.direction !== ChangeDirection.Unchanged || diff.grownFolders.length > 0;

export function growthLine(diff: SnapshotDiff, now: Date): string {
  const change = UiCopy.growth.changes[diff.total.direction](formatByteSize(diff.total.amount));
  return UiCopy.growth.sinceLastScan(formatAge(diff.previousTakenAt, now), change);
}

export function growthView(state: AppState, now: Date): GrowthView {
  const base = { kind: ScreenKind.Growth, title: UiCopy.growth.title } as const;
  const { growth } = state;
  if (growth === undefined) return { ...base, summary: UiCopy.growth.firstScan, rows: [] };
  const largest = growth.grownFolders[0]?.growth ?? ByteSize.zero;
  const summary =
    growth.grownFolders.length === 0
      ? `${growthLine(growth, now)}. ${UiCopy.growth.noneGrew(
          formatByteSize(state.context.historyPolicy.growthMinimumSize),
        )}`
      : growthLine(growth, now);
  return {
    ...base,
    summary,
    rows: growth.grownFolders.map((folder) => ({
      path: formatPath(folder.path, state.context.home),
      growth: padSize(UiCopy.growth.changes.grew(formatByteSize(folder.growth))),
      bar: sizeBar(folder.growth, largest),
      detail: UiCopy.growth.was(formatByteSize(folder.before)),
    })),
  };
}
