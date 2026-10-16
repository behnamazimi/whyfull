import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { assertNever } from "../../../domain/index.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { Layout } from "../view-models/layout.ts";
import { useColors } from "./color-scheme-context.ts";
import { ScreenKind } from "../state/screen.ts";
import type { ScreenView } from "../view-models/app-view.ts";
import type { DiagnosisView } from "../view-models/diagnosis-view.ts";
import { type DetailSection, type FindingDetailView } from "../view-models/finding-detail-view.ts";
import type { FoldersView } from "../view-models/folders-view.ts";
import type {
  CleanupReportView,
  CleanupReviewView,
  CleanupItem,
  BlockedRow,
  CleanupRow,
} from "../view-models/cleanup-view.ts";
import {
  OVERVIEW_DETAIL_INDENT,
  OverviewDensity,
  type DiskOverviewView,
} from "../view-models/disk-overview-view.ts";
import type { GrowthView } from "../view-models/growth-view.ts";
import {
  UnrecognizedDetailKind,
  type UnrecognizedDetailView,
} from "../view-models/unrecognized-detail-view.ts";
import {
  HelpLineKind,
  type HelpLine,
  type HelpView,
  type PermissionGuideView,
  type PromptPreviewView,
} from "../view-models/simple-views.ts";
import { Glyph } from "../../theme.ts";
import { HeaderLine, ListRows, type ListHandlers } from "./list-rows.tsx";

function Title({ text, aside }: { readonly text: string; readonly aside?: string }): ReactNode {
  const colors = useColors();
  return (
    <text flexShrink={0}>
      <span fg={colors.text} attributes={TextAttributes.BOLD}>
        {text}
      </span>
      {aside === undefined ? null : <span fg={colors.muted}> {aside}</span>}
    </text>
  );
}

function DiagnosisList({
  view,
  handlers,
}: {
  readonly view: DiagnosisView;
  readonly handlers: ListHandlers;
}): ReactNode {
  const colors = useColors();
  return (
    <>
      <Title text={view.title} {...(view.aside === undefined ? {} : { aside: view.aside })} />
      {view.chips.length === 0 ? null : (
        <text flexShrink={0}>
          {view.chips.map((chip) => (
            <span
              key={chip.filter}
              fg={chip.active ? colors.accent : colors.muted}
              {...(chip.active
                ? { bg: colors.selectionBackground, attributes: TextAttributes.BOLD }
                : {})}
            >
              {` ${chip.label} ${chip.count} `}
            </span>
          ))}
        </text>
      )}
      {view.subtitle === undefined ? null : (
        <text flexShrink={0} fg={colors.muted}>
          {view.subtitle}
        </text>
      )}
      {view.emptyMessage === undefined ? (
        <ListRows view={view} handlers={handlers} />
      ) : (
        <text flexShrink={0} fg={colors.muted}>
          {view.emptyMessage}
        </text>
      )}
    </>
  );
}

const NO_HANDLERS: ListHandlers = {
  onRowClick: () => undefined,
  onScroll: () => undefined,
};

function DiagnosisScreen({
  view,
  handlers,
}: {
  readonly view: DiagnosisView;
  readonly handlers: ListHandlers;
}): ReactNode {
  const colors = useColors();
  if (view.sidePane === undefined) {
    return (
      <box flexDirection="column" flexGrow={1} overflow="hidden" paddingLeft={1} paddingRight={1}>
        <DiagnosisList view={view} handlers={handlers} />
      </box>
    );
  }
  const { detail } = view.sidePane;
  return (
    <box flexDirection="row" flexGrow={1} overflow="hidden">
      <box flexDirection="column" flexGrow={1} flexShrink={1} overflow="hidden" paddingLeft={1}>
        <DiagnosisList view={view} handlers={handlers} />
      </box>
      <box
        flexDirection="column"
        width={Layout.detailPaneColumns}
        flexShrink={0}
        overflow="hidden"
        border={["left"]}
        borderColor={colors.barTrack}
      >
        {detail === undefined ? (
          <box paddingLeft={1}>
            <text fg={colors.muted}>{UiCopy.diagnosis.noDetail}</text>
          </box>
        ) : detail.kind === UnrecognizedDetailKind.Unrecognized ? (
          <UnrecognizedDetailPane view={detail} />
        ) : (
          <FindingDetailScreen view={detail} handlers={NO_HANDLERS} />
        )}
      </box>
    </box>
  );
}

function UnrecognizedDetailPane({ view }: { readonly view: UnrecognizedDetailView }): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column" flexGrow={1} overflow="hidden" paddingLeft={1} paddingRight={1}>
      <Title text={view.title} aside={view.size} />
      <text flexShrink={0} fg={colors[view.tone.color]}>
        {view.tone.icon} {view.tag}
      </text>
      <text flexShrink={0}> </text>
      {view.lines.map((line) => (
        <text flexShrink={0} key={line.text} fg={colors[line.color]} wrapMode="word">
          {line.text}
        </text>
      ))}
    </box>
  );
}

function DetailSectionRow({ section }: { readonly section: DetailSection }): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column" flexShrink={0} paddingBottom={1}>
      <text flexShrink={0} fg={colors.muted} attributes={TextAttributes.BOLD}>
        {section.label}
      </text>
      {section.lines.map((line) => (
        <text flexShrink={0} key={line.text} fg={colors[line.color]} wrapMode="word">
          {line.text}
        </text>
      ))}
    </box>
  );
}

function FindingDetailScreen({
  view,
  handlers,
}: {
  readonly view: FindingDetailView;
  readonly handlers: ListHandlers;
}): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column" flexGrow={1} overflow="hidden" paddingLeft={1} paddingRight={1}>
      <Title text={view.title} aside={view.size} />
      <text flexShrink={0} fg={colors[view.tone.color]}>
        {view.tone.icon} {view.tag}
      </text>
      <text flexShrink={0}> </text>
      {view.sections.map((section) => (
        <DetailSectionRow key={section.label} section={section} />
      ))}
      <text flexShrink={0} fg={colors.muted}>
        {view.locationsHeading}
      </text>
      <ListRows view={view} handlers={handlers} />
    </box>
  );
}

function FoldersScreen({
  view,
  handlers,
}: {
  readonly view: FoldersView;
  readonly handlers: ListHandlers;
}): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column" flexGrow={1} overflow="hidden" paddingLeft={1} paddingRight={1}>
      <Title text={view.title} aside={view.size} />
      <text flexShrink={0}> </text>
      {view.emptyMessage === undefined ? (
        <ListRows view={view} handlers={handlers} />
      ) : (
        <text flexShrink={0} fg={colors.muted}>
          {view.emptyMessage}
        </text>
      )}
    </box>
  );
}

function PromptPreviewScreen({ view }: { readonly view: PromptPreviewView }): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column" flexGrow={1} overflow="hidden" paddingLeft={1} paddingRight={1}>
      <Title text={view.title} />
      <text flexShrink={0} fg={colors.muted} wrapMode="word">
        {view.explanation}
      </text>
      <box
        border
        borderColor={colors.barTrack}
        flexDirection="column"
        padding={1}
        flexGrow={1}
        overflow="hidden"
      >
        {view.lines.map((line, index) => (
          <text flexShrink={0} key={index} fg={colors.text} wrapMode="word">
            {line.length === 0 ? " " : line}
          </text>
        ))}
      </box>
    </box>
  );
}

function HelpLineView({
  line,
  keyColumnWidth,
}: {
  readonly line: HelpLine;
  readonly keyColumnWidth: number;
}): ReactNode {
  const colors = useColors();
  switch (line.kind) {
    case HelpLineKind.Text:
      return (
        <text flexShrink={0} fg={colors.text} wrapMode="word">
          {line.text}
        </text>
      );
    case HelpLineKind.Blank:
      return <text flexShrink={0}> </text>;
    case HelpLineKind.Heading:
      return (
        <text flexShrink={0} fg={colors.accent} attributes={TextAttributes.BOLD}>
          {line.text}
        </text>
      );
    case HelpLineKind.Row:
      return (
        <text flexShrink={0} wrapMode="word">
          <span fg={colors[line.row.color]}> {line.row.marker} </span>
          <span fg={colors[line.row.color]} attributes={TextAttributes.BOLD}>
            {line.row.label.padEnd(keyColumnWidth - 1)}
          </span>
          <span fg={colors.text}>{line.row.text}</span>
        </text>
      );
    case HelpLineKind.KeyHeadings:
      return (
        <box flexDirection="row" flexShrink={0} gap={2}>
          {line.headings.map((heading) => (
            <box key={heading} flexGrow={1} flexBasis={0}>
              <text flexShrink={0} fg={colors.accent}>
                {heading}
              </text>
            </box>
          ))}
        </box>
      );
    case HelpLineKind.KeyRow:
      return (
        <box flexDirection="row" flexShrink={0} gap={2}>
          {line.cells.map((cell, index) => (
            <box key={cell?.key ?? index} flexGrow={1} flexBasis={0}>
              {cell === undefined ? null : (
                <text flexShrink={0}>
                  <span fg={colors.text} attributes={TextAttributes.BOLD}>
                    {cell.key.padEnd(keyColumnWidth)}
                  </span>
                  <span fg={colors.muted}>{cell.label}</span>
                </text>
              )}
            </box>
          ))}
        </box>
      );
  }
}

function HelpScreen({ view }: { readonly view: HelpView }): ReactNode {
  return (
    <box flexDirection="column" flexGrow={1} overflow="hidden" paddingLeft={1} paddingRight={1}>
      <Title text={view.title} />
      <text flexShrink={0}> </text>
      {view.lines.map((line, index) => (
        <HelpLineView key={index} line={line} keyColumnWidth={view.keyColumnWidth} />
      ))}
    </box>
  );
}

function DiskOverviewScreen({ view }: { readonly view: DiskOverviewView }): ReactNode {
  const colors = useColors();
  const compact = view.density === OverviewDensity.Compact;
  return (
    <box flexDirection="column" flexGrow={1} overflow="hidden" paddingLeft={1} paddingRight={1}>
      <Title text={view.title} />
      {compact ? null : <text flexShrink={0}> </text>}
      {view.loadingMessage === undefined ? null : (
        <text flexShrink={0} fg={colors.muted}>
          {view.loadingMessage}
        </text>
      )}
      {view.rows.map((row) => (
        <box
          key={row.title}
          flexDirection="column"
          flexShrink={0}
          paddingBottom={view.density === OverviewDensity.Roomy ? 1 : 0}
        >
          <text flexShrink={0}>
            <span fg={colors[row.color]}>
              {row.size} {row.bar}
            </span>
            <span fg={colors.text} attributes={TextAttributes.BOLD}>
              {" "}
              {row.title}
            </span>
            {compact ? (
              <span fg={colors.muted}>
                {"  "}
                {row.detail}
              </span>
            ) : null}
          </text>
          {compact ? null : (
            <box flexShrink={0} paddingLeft={OVERVIEW_DETAIL_INDENT}>
              <text flexShrink={0} fg={colors.muted} wrapMode="word">
                {row.detail}
              </text>
            </box>
          )}
        </box>
      ))}
      {view.notes.map((note) => (
        <text key={note} flexShrink={0} fg={colors.caution} wrapMode="word">
          {note}
        </text>
      ))}
    </box>
  );
}

function PermissionGuideScreen({ view }: { readonly view: PermissionGuideView }): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column" flexGrow={1} overflow="hidden" paddingLeft={1} paddingRight={1}>
      <Title text={view.title} />
      <text flexShrink={0}> </text>
      <text flexShrink={0} fg={colors.text} wrapMode="word">
        {view.intro}
      </text>
      <text flexShrink={0}> </text>
      {view.steps.map((step) => (
        <text flexShrink={0} key={step} fg={colors.text} wrapMode="word">
          {step}
        </text>
      ))}
      <text flexShrink={0}> </text>
      {view.status === undefined ? null : (
        <text flexShrink={0} fg={colors.safe}>
          {view.status}
        </text>
      )}
    </box>
  );
}

function CleanupRows({ rows }: { readonly rows: readonly CleanupRow[] }): ReactNode {
  const colors = useColors();
  return rows.map((row, index) => (
    <box key={`${row.target}-${String(index)}`} flexDirection="column" flexShrink={0}>
      <text flexShrink={0}>
        <span fg={colors[row.color]}>{row.size} </span>
        <span fg={colors.text}>{row.target}</span>
      </text>
      <text flexShrink={0} fg={colors.muted}>
        {"          "}
        {row.label}
      </text>
    </box>
  ));
}

function CleanupItems({ items }: { readonly items: readonly CleanupItem[] }): ReactNode {
  const colors = useColors();
  return items.map((item) => (
    <box key={item.heading} flexDirection="column" flexShrink={0}>
      <text flexShrink={0}>
        <span fg={colors[item.markColor]}>{`  ${item.mark}  `}</span>
        <span fg={colors.text}> {item.size} </span>
        <span fg={colors.bar}>{item.bar}</span>
        <span fg={colors.text} attributes={TextAttributes.BOLD}>
          {" "}
          {item.heading}
        </span>
        {item.note === "" ? null : <span fg={colors.muted}>{item.note}</span>}
      </text>
      {item.places.map((place) => (
        <text key={place.target} flexShrink={0} fg={colors.muted}>
          {"      "}
          {place.size} {place.target}
        </text>
      ))}
      {item.morePlaces === undefined ? null : (
        <text flexShrink={0} fg={colors.muted}>
          {"               "}
          {item.morePlaces}
        </text>
      )}
    </box>
  ));
}

function BlockedRows({ rows }: { readonly rows: readonly BlockedRow[] }): ReactNode {
  const colors = useColors();
  return rows.map((row, index) => (
    <box
      key={`${row.title}-${String(index)}`}
      flexDirection="row"
      justifyContent="space-between"
      flexShrink={0}
      paddingRight={1}
    >
      <text>
        <span fg={colors.text}>{`      ${row.size} `}</span>
        <span fg={colors.barTrack}>{row.bar}</span>
        <span fg={colors.text} attributes={TextAttributes.BOLD}>
          {" "}
          {row.title}
        </span>
      </text>
      <text fg={colors.caution}>{row.reason}</text>
    </box>
  ));
}

function CleanupReviewScreen({ view }: { readonly view: CleanupReviewView }): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column" flexGrow={1} overflow="hidden" paddingLeft={1} paddingRight={1}>
      <box flexDirection="row" justifyContent="space-between" flexShrink={0}>
        <Title text={view.title} aside={view.aside} />
        <text fg={colors.safe}>{view.freed}</text>
      </box>
      <text flexShrink={0}>
        {view.progressBar === undefined ? null : <span fg={colors.bar}>{view.progressBar} </span>}
        <span fg={colors.caution}>{view.status ?? " "}</span>
      </text>
      {view.sections.map((section) => (
        <box key={section.header.title} flexDirection="column" flexShrink={0} paddingBottom={1}>
          <HeaderLine header={section.header} />
          <CleanupItems items={section.items} />
        </box>
      ))}
      {view.hiddenItems === undefined ? null : (
        <text flexShrink={0} fg={colors.muted}>
          {view.hiddenItems}
        </text>
      )}
      {view.blocked === undefined ? null : (
        <box flexDirection="column" flexShrink={0} paddingBottom={1}>
          <HeaderLine header={view.blocked.header} />
          <BlockedRows rows={view.blocked.rows} />
        </box>
      )}
      {view.summary.map((line) => (
        <text flexShrink={0} key={line} fg={colors.text} wrapMode="word">
          {line}
        </text>
      ))}
      {view.confirmation === undefined ? null : (
        <>
          <text flexShrink={0}> </text>
          <text flexShrink={0}>
            <span fg={colors.danger} attributes={TextAttributes.BOLD}>
              {view.confirmation.prompt}
            </span>
            <span fg={colors.text}>{view.confirmation.typed}</span>
            <span fg={colors.accent}>{Glyph.cursor}</span>
          </text>
        </>
      )}
    </box>
  );
}

function CleanupReportScreen({ view }: { readonly view: CleanupReportView }): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column" flexGrow={1} overflow="hidden" paddingLeft={1} paddingRight={1}>
      <Title text={view.title} />
      <text flexShrink={0}> </text>
      {view.summary.map((line) => (
        <text flexShrink={0} key={line} fg={colors.safe} wrapMode="word">
          {line}
        </text>
      ))}
      {view.problemsHeading === undefined ? null : (
        <box flexDirection="column" paddingTop={1}>
          <text flexShrink={0} fg={colors.danger}>
            {view.problemsHeading}
          </text>
          <CleanupRows rows={view.problems} />
        </box>
      )}
    </box>
  );
}

function GrowthScreen({ view }: { readonly view: GrowthView }): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column" flexGrow={1} overflow="hidden" paddingLeft={1} paddingRight={1}>
      <Title text={view.title} />
      <text flexShrink={0} fg={colors.muted} wrapMode="word">
        {view.summary}
      </text>
      <text flexShrink={0}> </text>
      {view.rows.map((row) => (
        <text flexShrink={0} key={row.path}>
          <span fg={colors.caution}>{row.growth} </span>
          <span fg={colors.bar}>{row.bar}</span>
          <span fg={colors.text}> {row.path}</span>
          <span fg={colors.muted}> {row.detail}</span>
        </text>
      ))}
    </box>
  );
}

export function ScreenBody({
  view,
  handlers,
}: {
  readonly view: ScreenView;
  readonly handlers: ListHandlers;
}): ReactNode {
  switch (view.kind) {
    case ScreenKind.Diagnosis:
      return <DiagnosisScreen view={view} handlers={handlers} />;
    case ScreenKind.FindingDetail:
      return <FindingDetailScreen view={view} handlers={handlers} />;
    case ScreenKind.Folders:
      return <FoldersScreen view={view} handlers={handlers} />;
    case ScreenKind.PromptPreview:
      return <PromptPreviewScreen view={view} />;
    case ScreenKind.Help:
      return <HelpScreen view={view} />;
    case ScreenKind.DiskOverview:
      return <DiskOverviewScreen view={view} />;
    case ScreenKind.PermissionGuide:
      return <PermissionGuideScreen view={view} />;
    case ScreenKind.CleanupReview:
      return <CleanupReviewScreen view={view} />;
    case ScreenKind.CleanupReport:
      return <CleanupReportScreen view={view} />;
    case ScreenKind.Growth:
      return <GrowthScreen view={view} />;
    default:
      return assertNever(view);
  }
}
