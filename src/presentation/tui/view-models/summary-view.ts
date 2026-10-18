import { DiagnosisStage } from "../../../application/index.ts";
import {
  ByteSize,
  ChangeDirection,
  FindingGroup,
  outcomeOfCart,
  ScanScopeKind,
  sizeOfGroup,
  type FolderGrowth,
  type UsageBreakdown,
  type VolumeUsage,
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
import { hasNote, hasRules, summaryBarWidth } from "./density.ts";
import { shareColor, shareGlyph, usageBreakdownOf } from "./disk-breakdown.ts";
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
/** Parts of a bar that get a segment each; anything smaller shares the last one. */
const NAMED_PIECES = 7;
const SCAN_NOTE_RESERVED_WIDTH = 4;
/** Where the cursor is on a tab whose rows aren't the bar's parts. */
const NO_ROW = -1;

/** A run of words in one colour. The heading and the tail are lines made of these. */
export interface TextPart {
  readonly text: string;
  readonly color: ColorRole;
  readonly bold: boolean;
}

export interface SummaryView {
  readonly density: Density;
  /** What the screen is about, such as how full the disk is or which folder this is. */
  readonly heading: readonly TextPart[];
  /** A fact at the right of the heading. */
  readonly fact: string;
  readonly factColor: ColorRole;
  readonly bar: readonly BarSegment[];
  /** Said after the bar, such as how much space the cleanup would give back. */
  readonly tail: readonly TextPart[];
  readonly note: string | undefined;
  readonly noteColor: ColorRole;
  readonly rule: string | undefined;
}

type Content = Pick<
  SummaryView,
  "heading" | "fact" | "factColor" | "bar" | "tail" | "note" | "noteColor"
>;

const words = (text: string, color: ColorRole = ColorRole.text): TextPart => ({
  text,
  color,
  bold: false,
});

const strong = (text: string, color: ColorRole = ColorRole.text): TextPart => ({
  text,
  color,
  bold: true,
});

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
  readonly size: ByteSize;
  readonly color?: ColorRole;
  readonly glyph?: string;
}

/**
 * One segment for each of the first pieces, in the order the list shows them. The one under the
 * cursor takes the cursor's colour, so the list and the bar can be read together.
 */
function pieceBar(pieces: readonly Piece[], selected: number, width: number): BarSegment[] {
  const named = pieces.slice(0, NAMED_PIECES);
  const rest = ByteSize.sum(pieces.slice(NAMED_PIECES).map((piece) => piece.size));
  const shown: readonly Piece[] = rest.isZero()
    ? named
    : [...named, { size: rest, color: ColorRole.tintFaint }];
  const total = ByteSize.sum(shown.map((piece) => piece.size));
  const shares = shown.map((piece, index): BarShare => {
    const color =
      index === selected
        ? ColorRole.accent
        : (piece.color ?? tints[index % tints.length] ?? ColorRole.tintFaint);
    const share = piece.size.shareOf(total);
    return piece.glyph === undefined ? { share, color } : { share, color, glyph: piece.glyph };
  });
  return stackedBar(shares, width);
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

/** While the scan runs or after it fails, the disk's own numbers still sit at the right. */
function runningFact(volume: VolumeUsage | undefined): Pick<Content, "fact" | "factColor"> {
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

function cleanupBar(volume: VolumeUsage, state: AppState, width: number): readonly BarSegment[] {
  const { freesNow } = outcomeOfCart(state.cart.values());
  const freed = freesNow.isAtLeast(volume.used) ? volume.used : freesNow;
  return stackedBar(
    [
      {
        share: volume.used.minusOrZero(freed).shareOf(volume.capacity),
        color: ColorRole.tintStrong,
      },
      { share: freed.shareOf(volume.capacity), color: ColorRole.safe, glyph: Glyph.barDense },
      {
        share: volume.available.shareOf(volume.capacity),
        color: ColorRole.barTrack,
        glyph: Glyph.barEmpty,
      },
    ],
    width,
  );
}

/** What the cleanup would give back. Trash and tool amounts are said apart: they don't free space now. */
function cleanupTail(volume: VolumeUsage, state: AppState): readonly TextPart[] {
  const { cart } = state;
  if (cart.size === 0) return [words(UiCopy.summary.pickToSeeGain, ColorRole.muted)];
  const outcome = outcomeOfCart(cart.values());
  const parts: TextPart[] = [];
  if (!outcome.freesNow.isZero()) {
    const after = formatByteSize(volume.available.plus(outcome.freesNow));
    parts.push(strong(UiCopy.summary.afterCleanup(after), ColorRole.safe));
  }
  const later = [
    outcome.toTrash.isZero() ? "" : UiCopy.summary.afterTrash(formatByteSize(outcome.toTrash)),
    outcome.viaTools.isZero() ? "" : UiCopy.summary.moreWithTools(formatByteSize(outcome.viaTools)),
  ].filter((part) => part !== "");
  if (later.length > 0) {
    const lead = parts.length === 0 ? "" : Glyph.separator;
    parts.push(words(`${lead}${later.join(Glyph.separator)}`, ColorRole.muted));
  }
  return parts;
}

/** The width a tail takes, with the space that sets it apart from the bar. */
const widthOf = (parts: readonly TextPart[]): number =>
  parts.length === 0 ? 0 : parts.reduce((total, part) => total + part.text.length, 1);

function cleanupContent(state: AppState, width: number, now: Date): Content {
  const { scan, volume } = state;
  switch (scan.status) {
    case ScanStatus.Running: {
      const reclaimable = sizeOfGroup(scan.findings, FindingGroup.Safe);
      return {
        heading: reclaimable.isZero()
          ? [words(scanText(state))]
          : [
              strong(formatByteSize(reclaimable), ColorRole.safe),
              words(` ${UiCopy.summary.safeSoFar}`),
            ],
        ...runningFact(volume),
        bar: scanProgress(state, width, now),
        tail: [],
        note: [
          reclaimable.isZero() ? "" : scanText(state),
          scan.findings.length === 0 ? "" : UiCopy.scanning.sizesMayGrow,
        ]
          .filter((part) => part !== "")
          .join(Glyph.separator),
        noteColor: ColorRole.muted,
      };
    }
    case ScanStatus.Failed:
      return {
        heading: [words(UiCopy.scanning.failed(scan.reason))],
        ...runningFact(volume),
        bar: [],
        tail: [],
        note: undefined,
        noteColor: ColorRole.muted,
      };
    case ScanStatus.Completed: {
      if (volume === undefined) {
        return {
          heading: [words(UiCopy.frame.diskUnknown, ColorRole.muted)],
          fact: "",
          factColor: ColorRole.muted,
          bar: [],
          tail: [],
          note: scopeNote(state),
          noteColor: ColorRole.muted,
        };
      }
      const shareUsed = volume.used.shareOf(volume.capacity);
      const tail = cleanupTail(volume, state);
      return {
        heading: [
          strong(UiCopy.summary.diskIs),
          strong(UiCopy.summary.percentFull(formatPercent(shareUsed)), diskColor(shareUsed)),
        ],
        fact: UiCopy.summary.freeOf(
          formatByteSize(volume.available),
          formatByteSize(volume.capacity),
        ),
        factColor: ColorRole.muted,
        bar: cleanupBar(volume, state, Math.max(1, width - widthOf(tail))),
        tail,
        note: scopeNote(state),
        noteColor: ColorRole.muted,
      };
    }
  }
}

/** The row under the cursor on a tab whose list is the bar's legend, or none. */
function cursorOf(state: AppState): number {
  const beneath = screenBeneath(state.screen);
  switch (beneath.kind) {
    case ScreenKind.Folders:
    case ScreenKind.DiskOverview:
    case ScreenKind.Growth:
      return beneath.selected;
    case ScreenKind.Diagnosis:
    case ScreenKind.FindingDetail:
      return NO_ROW;
  }
}

function foldersContent(state: AppState, width: number): Content {
  const beneath = screenBeneath(state.screen);
  const folder = beneath.kind === ScreenKind.Folders ? folderAt(state, beneath.folder) : undefined;
  const base = { factColor: ColorRole.muted, tail: [], noteColor: ColorRole.muted } as const;
  if (beneath.kind !== ScreenKind.Folders || folder === undefined) {
    return {
      ...base,
      heading: [words(UiCopy.tree.empty)],
      fact: "",
      bar: [],
      note: undefined,
    };
  }
  const size = formatByteSize(folder.totalSize);
  const fact = UiCopy.summary.inThisFolder(size);
  const path = truncateMiddle(
    formatBreadcrumb(formatPath(beneath.folder, state.context.home)),
    Math.max(Layout.minimumTextWidth, width - fact.length - Layout.horizontalPadding),
  );
  return {
    ...base,
    heading: [strong(path)],
    fact,
    bar: pieceBar(
      folderEntries(state, folder).map((entry) => ({ size: entry.size })),
      cursorOf(state),
      width,
    ),
    note: UiCopy.summary.foldersNote,
  };
}

function diskContent(state: AppState, width: number): Content {
  const { volume } = state;
  const breakdown: UsageBreakdown | undefined = usageBreakdownOf(state);
  const base = { tail: [], noteColor: ColorRole.muted } as const;
  if (volume === undefined || breakdown === undefined) {
    return {
      ...base,
      heading: [words(UiCopy.overview.loading, ColorRole.muted)],
      fact: "",
      factColor: ColorRole.muted,
      bar: [],
      note: undefined,
    };
  }
  const shareUsed = volume.used.shareOf(volume.capacity);
  const pieces: readonly Piece[] = [
    ...breakdown.shares.map((share) => ({
      size: share.size,
      color: shareColor[share.kind],
      glyph: shareGlyph[share.kind],
    })),
    { size: breakdown.free, color: ColorRole.safe, glyph: Glyph.barFree },
  ];
  return {
    ...base,
    heading: [strong(UiCopy.overview.title)],
    fact: UiCopy.summary.usedOf(formatByteSize(volume.used), formatByteSize(volume.capacity)),
    factColor: diskColor(shareUsed),
    bar: pieceBar(pieces, cursorOf(state), width),
    note: UiCopy.summary.diskNote(keyLabel[UserAction.ShowCleanup]),
  };
}

function growthContent(state: AppState, now: Date, width: number): Content {
  const { growth } = state;
  const base = { tail: [], noteColor: ColorRole.muted } as const;
  if (growth === undefined) {
    return {
      ...base,
      heading: [strong(UiCopy.summary.firstScan)],
      fact: "",
      factColor: ColorRole.muted,
      bar: [],
      note: undefined,
    };
  }
  const change = UiCopy.growth.changes[growth.total.direction](formatByteSize(growth.total.amount));
  const grew = growth.total.direction === ChangeDirection.Grew;
  return {
    ...base,
    heading: [
      strong(change, grew ? ColorRole.caution : ColorRole.text),
      words(` ${UiCopy.summary.sinceLastScan(formatAge(growth.previousTakenAt, now))}`),
    ],
    fact: UiCopy.summary.foldersGrew(growth.grownFolders.length),
    factColor: ColorRole.muted,
    bar: pieceBar(
      growth.grownFolders.map((folder: FolderGrowth) => ({ size: folder.growth })),
      cursorOf(state),
      width,
    ),
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
    state.scan.status === ScanStatus.Running && tabOf(state.screen) === Tab.Cleanup
      ? progressWidth
      : width,
    now,
  );
  const noteWidth = viewport.columns - Layout.horizontalPadding;
  return {
    density,
    ...content,
    note:
      hasNote(density) && content.note !== undefined
        ? truncate(content.note, noteWidth)
        : undefined,
    rule: hasRules(density) ? Glyph.rule.repeat(Math.max(0, viewport.columns)) : undefined,
  };
}
