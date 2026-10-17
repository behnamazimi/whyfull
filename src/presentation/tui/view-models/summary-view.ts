import { DiagnosisStage } from "../../../application/index.ts";
import {
  ByteSize,
  ChangeDirection,
  FindingGroup,
  ScanScopeKind,
  sizeOfGroup,
  UsageShareKind,
  type FolderGrowth,
  type UsageBreakdown,
} from "../../../domain/index.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatAge } from "../../format/age-format.ts";
import { formatBreadcrumb } from "../../format/breadcrumb-format.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { formatPercent } from "../../format/percent-format.ts";
import { keyLabel, UserAction } from "../../keymap.ts";
import { ColorRole, Glyph } from "../../theme.ts";
import { ScanStatus, type AppState } from "../state/app-state.ts";
import { ScreenKind, screenBeneath, Tab, tabOf } from "../state/screen.ts";
import { folderAt, folderEntries } from "../state/selectors.ts";
import type { Density } from "./density.ts";
import { hasLegend, hasNote, hasRules, summaryBarWidth } from "./density.ts";
import { shareColor, usageBreakdownOf } from "./disk-breakdown.ts";
import { scopeName } from "./scope-name.ts";
import {
  Layout,
  stackedBar,
  truncate,
  truncateMiddle,
  type BarSegment,
  type BarShare,
  type Viewport,
} from "./layout.ts";

const NEARLY_FULL_SHARE = 0.9;
const FILLING_UP_SHARE = 0.75;
const SPINNER_FRAME_MILLISECONDS = 100;
/** A folder scan can't know its total, so the bar never claims to be finished. */
const MOST_OF_THE_WAY = 0.99;
const NAMED_PIECES = 3;
const LEGEND_GAP_WIDTH = 3;
const LEGEND_SWATCH_WIDTH = 2;
const LEGEND_VALUE_GAP_WIDTH = 1;
const SCAN_NOTE_RESERVED_WIDTH = 4;
const NEXT_TO_LAST = 2;

export interface LegendItem {
  readonly text: string;
  readonly value: string;
  readonly color: ColorRole;
  readonly glyph: string;
}

export interface SummaryView {
  readonly density: Density;
  /** The one number the screen is about, such as how much can be cleared. */
  readonly headline: string;
  readonly headlineColor: ColorRole;
  readonly aside: string;
  /** What is true of the disk, whichever tab is open. */
  readonly fact: string;
  readonly factColor: ColorRole;
  readonly bar: readonly BarSegment[];
  readonly legend: readonly LegendItem[];
  readonly note: string | undefined;
  readonly noteColor: ColorRole;
  readonly rule: string | undefined;
}

type Content = Pick<
  SummaryView,
  "headline" | "headlineColor" | "aside" | "bar" | "legend" | "note" | "noteColor"
>;

const diskColor = (shareUsed: number): ColorRole => {
  if (shareUsed >= NEARLY_FULL_SHARE) return ColorRole.danger;
  if (shareUsed >= FILLING_UP_SHARE) return ColorRole.caution;
  return ColorRole.safe;
};

const tints: readonly ColorRole[] = [
  ColorRole.tintStrong,
  ColorRole.tintMid,
  ColorRole.tintSoft,
  ColorRole.tintFaint,
];

interface Piece {
  readonly name: string;
  readonly size: ByteSize;
}

/** The biggest pieces get a colour of their own; everything smaller shares the last one. */
function tintedPieces(
  pieces: readonly Piece[],
  describe: (size: ByteSize) => string,
  width: number,
): Pick<Content, "bar" | "legend"> {
  const sorted = [...pieces].sort((left, right) => ByteSize.largestFirst(left.size, right.size));
  const named = sorted.slice(0, NAMED_PIECES);
  const rest = sorted.slice(NAMED_PIECES);
  const restSize = ByteSize.sum(rest.map((piece) => piece.size));
  const shown: Piece[] =
    rest.length === 0 ? named : [...named, { name: UiCopy.summary.everythingElse, size: restSize }];
  const total = ByteSize.sum(shown.map((piece) => piece.size));
  return {
    bar: stackedBar(
      shown.map((piece, index) => ({
        share: piece.size.shareOf(total),
        color: tints[index] ?? ColorRole.tintFaint,
      })),
      width,
    ),
    legend: shown.map((piece, index) => ({
      text: piece.name,
      value: describe(piece.size),
      color: tints[index] ?? ColorRole.tintFaint,
      glyph: Glyph.swatch,
    })),
  };
}

const legendItemWidth = (item: LegendItem): number =>
  LEGEND_SWATCH_WIDTH + item.text.length + LEGEND_VALUE_GAP_WIDTH + item.value.length;

/** Drops items from the end, but keeps the last one, which is the one people look for (free space). */
export function fitLegend(items: readonly LegendItem[], width: number): readonly LegendItem[] {
  const widthOf = (list: readonly LegendItem[]): number =>
    list.reduce((total, item) => total + legendItemWidth(item), 0) +
    Math.max(0, list.length - 1) * LEGEND_GAP_WIDTH;
  let shown = items;
  while (shown.length > 1 && widthOf(shown) > width) {
    shown = [...shown.slice(0, shown.length - NEXT_TO_LAST), ...shown.slice(shown.length - 1)];
  }
  return shown;
}

function spinnerSegment(now: Date): BarSegment {
  const frame = Math.floor(now.getTime() / SPINNER_FRAME_MILLISECONDS) % Glyph.spinner.length;
  return { text: `${Glyph.spinner[frame] ?? Glyph.working} `, color: ColorRole.accent };
}

function scanProgress(state: AppState, width: number, now: Date): readonly BarSegment[] {
  const { scan, volume } = state;
  if (scan.status !== ScanStatus.Running) return [];
  const spinner = spinnerSegment(now);
  if (scan.progress === undefined || volume === undefined) return [spinner];
  const share = Math.min(scan.progress.sizeFound.shareOf(volume.used), MOST_OF_THE_WAY);
  const filled = Math.round(share * width);
  return [
    spinner,
    { text: Glyph.barFull.repeat(filled), color: ColorRole.accent },
    { text: Glyph.barEmpty.repeat(Math.max(0, width - filled)), color: ColorRole.barTrack },
  ];
}

function scanText(state: AppState): string {
  const { scan, volume } = state;
  if (scan.status !== ScanStatus.Running) return "";
  if (scan.stage === DiagnosisStage.KnownLocations) return UiCopy.scanning.knownLocations;
  if (scan.progress === undefined) return UiCopy.scanning.starting;
  if (volume === undefined) {
    return UiCopy.scanning.progress(
      scan.progress.directoriesScanned,
      formatByteSize(scan.progress.sizeFound),
    );
  }
  const share = Math.min(scan.progress.sizeFound.shareOf(volume.used), MOST_OF_THE_WAY);
  return UiCopy.scanning.checkedSoFar(
    formatPercent(share),
    formatByteSize(scan.progress.sizeFound),
  );
}

function scopeNote(state: AppState): string {
  const { scope, volume, context, scan } = state;
  if (scan.status !== ScanStatus.Completed) return "";
  const scanned = formatByteSize(scan.report.snapshot.root.totalSize);
  if (scope.kind === ScanScopeKind.WholeDisk) return UiCopy.summary.scopeWholeDisk(scanned);
  const path = scopeName(state);
  const lookedAt =
    volume === undefined
      ? UiCopy.summary.scopeFolderOnly(path, scanned)
      : UiCopy.summary.scopeFolder(path, scanned, formatByteSize(volume.used));
  return context.wholeDiskScope === undefined
    ? lookedAt
    : lookedAt + UiCopy.summary.checkWholeDisk(keyLabel[UserAction.ScanWholeDisk]);
}

function swatchFor(barGlyph: string | undefined): string {
  if (barGlyph === Glyph.hatch) return Glyph.swatchHatch;
  if (barGlyph === Glyph.barEmpty) return Glyph.swatchEmpty;
  return Glyph.swatch;
}

function cleanupBar(
  state: AppState,
  breakdown: UsageBreakdown | undefined,
  width: number,
): Pick<Content, "bar" | "legend"> {
  const { findings } = state.scan;
  const safe = sizeOfGroup(findings, FindingGroup.Safe);
  const check = sizeOfGroup(findings, FindingGroup.Check);
  const unrecognized = sizeOfGroup(findings, FindingGroup.Unrecognized);
  const scanned =
    breakdown?.shares.find((share) => share.kind === UsageShareKind.ScannedFolder)?.size ??
    (state.scan.status === ScanStatus.Completed
      ? state.scan.report.snapshot.root.totalSize
      : ByteSize.zero);
  const other = scanned.minusOrZero(safe).minusOrZero(check).minusOrZero(unrecognized);
  const notChecked = ByteSize.sum(
    (breakdown?.shares ?? [])
      .filter((share) => share.kind !== UsageShareKind.ScannedFolder)
      .map((share) => share.size),
  );
  const free = breakdown?.free ?? ByteSize.zero;
  const whole = breakdown?.capacity ?? scanned;
  const parts: readonly (BarShare & { readonly size: ByteSize; readonly label: string })[] = [
    {
      size: safe,
      label: UiCopy.summary.legend.safe,
      share: safe.shareOf(whole),
      color: ColorRole.safe,
    },
    {
      size: check,
      label: UiCopy.summary.legend.check,
      share: check.shareOf(whole),
      color: ColorRole.caution,
    },
    {
      size: unrecognized,
      label: UiCopy.summary.legend.unrecognized,
      share: unrecognized.shareOf(whole),
      color: ColorRole.unknown,
    },
    {
      size: other,
      label: UiCopy.summary.legend.other,
      share: other.shareOf(whole),
      color: ColorRole.tintSoft,
    },
    {
      size: notChecked,
      label: UiCopy.summary.legend.notChecked,
      share: notChecked.shareOf(whole),
      color: ColorRole.tintFaint,
      glyph: Glyph.hatch,
    },
    {
      size: free,
      label: UiCopy.summary.legend.free,
      share: free.shareOf(whole),
      color: ColorRole.barTrack,
      glyph: Glyph.barEmpty,
    },
  ];
  const present = parts.filter((part) => !part.size.isZero());
  return {
    bar: stackedBar(present, width),
    legend: present.map((part) => ({
      text: part.label,
      value: formatByteSize(part.size),
      color: part.color,
      glyph: swatchFor(part.glyph),
    })),
  };
}

function cleanupContent(state: AppState, width: number, now: Date): Content {
  const { scan } = state;
  const reclaimable = sizeOfGroup(scan.findings, FindingGroup.Safe);
  switch (scan.status) {
    case ScanStatus.Running:
      return {
        headline: reclaimable.isZero() ? "" : formatByteSize(reclaimable),
        headlineColor: ColorRole.safe,
        aside: reclaimable.isZero() ? scanText(state) : UiCopy.summary.safeSoFar,
        bar: scanProgress(state, width, now),
        legend: [],
        note: [
          reclaimable.isZero() ? "" : scanText(state),
          scan.findings.length === 0 ? "" : UiCopy.scanning.sizesMayGrow,
        ]
          .filter((part) => part !== "")
          .join(Glyph.separator),
        noteColor: ColorRole.muted,
      };
    case ScanStatus.Failed:
      return {
        headline: "",
        headlineColor: ColorRole.danger,
        aside: UiCopy.scanning.failed(scan.reason),
        bar: [],
        legend: [],
        note: undefined,
        noteColor: ColorRole.muted,
      };
    case ScanStatus.Completed:
      return {
        headline: reclaimable.isZero() ? "" : formatByteSize(reclaimable),
        headlineColor: ColorRole.safe,
        aside: reclaimable.isZero() ? UiCopy.summary.nothingSafe : UiCopy.summary.safeToClear,
        ...cleanupBar(state, usageBreakdownOf(state), width),
        note: scopeNote(state),
        noteColor: ColorRole.muted,
      };
  }
}

function foldersContent(state: AppState, width: number): Content {
  const { screen } = state;
  const base = { headlineColor: ColorRole.text, noteColor: ColorRole.muted } as const;
  const beneath = screenBeneath(screen);
  const folder = beneath.kind === ScreenKind.Folders ? folderAt(state, beneath.folder) : undefined;
  if (beneath.kind !== ScreenKind.Folders || folder === undefined) {
    return {
      ...base,
      headline: "",
      aside: UiCopy.tree.empty,
      bar: [],
      legend: [],
      note: undefined,
    };
  }
  const entries = folderEntries(state, folder);
  const path = truncateMiddle(
    formatBreadcrumb(formatPath(beneath.folder, state.context.home)),
    Math.max(Layout.minimumTextWidth, width - formatByteSize(folder.totalSize).length),
  );
  return {
    ...base,
    headline: formatByteSize(folder.totalSize),
    aside: path,
    ...tintedPieces(
      entries.map((entry) => ({ name: entry.path.name, size: entry.size })),
      formatByteSize,
      width,
    ),
    note: UiCopy.summary.foldersNote,
  };
}

function diskContent(state: AppState, width: number): Content {
  const { volume } = state;
  const breakdown = usageBreakdownOf(state);
  const base = { noteColor: ColorRole.caution } as const;
  if (volume === undefined || breakdown === undefined) {
    return {
      ...base,
      headline: "",
      headlineColor: ColorRole.muted,
      aside: UiCopy.overview.loading,
      bar: [],
      legend: [],
      note: undefined,
    };
  }
  const shareUsed = volume.used.shareOf(volume.capacity);
  const context = {
    scannedFolder: scopeName(state),
    wholeDisk: state.scope.kind === ScanScopeKind.WholeDisk,
  };
  const parts = [
    ...breakdown.shares.map((share) => ({
      text: UiCopy.overview.shares[share.kind]({
        ...context,
        volumeNames: share.volumeNames.join(", "),
      }).title,
      size: share.size,
      color: shareColor[share.kind],
    })),
    { text: UiCopy.overview.free.title, size: breakdown.free, color: ColorRole.safe },
  ];
  return {
    ...base,
    headline: formatByteSize(volume.used),
    headlineColor: diskColor(shareUsed),
    aside: UiCopy.summary.inUse,
    bar: stackedBar(
      parts.map((part) => ({ share: part.size.shareOf(breakdown.capacity), color: part.color })),
      width,
    ),
    legend: parts.map((part) => ({
      text: part.text,
      value: formatByteSize(part.size),
      color: part.color,
      glyph: Glyph.swatch,
    })),
    note: undefined,
  };
}

function growthContent(state: AppState, now: Date, width: number): Content {
  const { growth } = state;
  const base = { noteColor: ColorRole.muted } as const;
  if (growth === undefined) {
    return {
      ...base,
      headline: UiCopy.summary.firstScan,
      headlineColor: ColorRole.text,
      aside: "",
      bar: [],
      legend: [],
      note: undefined,
    };
  }
  const change = UiCopy.growth.changes[growth.total.direction](formatByteSize(growth.total.amount));
  const pieces = growth.grownFolders.map((folder: FolderGrowth) => ({
    name: formatPath(folder.path, state.context.home),
    size: folder.growth,
  }));
  return {
    ...base,
    headline: change,
    headlineColor:
      growth.total.direction === ChangeDirection.Grew ? ColorRole.caution : ColorRole.text,
    aside: UiCopy.summary.sinceLastScan(formatAge(growth.previousTakenAt, now)),
    ...tintedPieces(pieces, (size) => UiCopy.growth.changes.grew(formatByteSize(size)), width),
    note:
      growth.grownFolders.length === 0
        ? undefined
        : UiCopy.summary.growthNote(formatByteSize(state.context.historyPolicy.growthMinimumSize)),
  };
}

function contentFor(state: AppState, width: number, now: Date): Content {
  switch (tabOf(state.screen)) {
    case Tab.Cleanup:
      return cleanupContent(state, width, now);
    case Tab.Folders:
      return foldersContent(state, width);
    case Tab.Disk:
      return diskContent(state, width);
    case Tab.Grew:
      return growthContent(state, now, width);
  }
}

function diskFact(state: AppState): Pick<SummaryView, "fact" | "factColor"> {
  const { volume } = state;
  if (volume === undefined) return { fact: UiCopy.frame.diskUnknown, factColor: ColorRole.muted };
  const shareUsed = volume.used.shareOf(volume.capacity);
  return {
    fact: UiCopy.frame.diskSummary(
      formatPercent(shareUsed),
      formatByteSize(volume.available),
      formatByteSize(volume.capacity),
    ),
    factColor: diskColor(shareUsed),
  };
}

export function summaryView(
  state: AppState,
  viewport: Viewport,
  density: Density,
  now: Date,
): SummaryView {
  const width = summaryBarWidth(viewport.columns);
  const progressWidth = Math.max(1, width - SCAN_NOTE_RESERVED_WIDTH);
  const content = contentFor(
    state,
    state.scan.status === ScanStatus.Running ? progressWidth : width,
    now,
  );
  const legendWidth = viewport.columns - Layout.horizontalPadding;
  return {
    density,
    ...content,
    ...diskFact(state),
    legend: hasLegend(density) ? fitLegend(content.legend, legendWidth) : [],
    note:
      hasNote(density) && content.note !== undefined
        ? truncate(content.note, legendWidth)
        : undefined,
    rule: hasRules(density) ? Glyph.rule.repeat(Math.max(0, viewport.columns)) : undefined,
  };
}
