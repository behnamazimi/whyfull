import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { assertNever } from "../../../domain/index.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { Layout } from "../view-models/layout.ts";
import { useColors } from "./color-scheme-context.ts";
import { ScreenKind } from "../state/screen.ts";
import type { ScreenView } from "../view-models/app-view.ts";
import type { DiagnosisView } from "../view-models/diagnosis-view.ts";
import {
  DETAIL_LABEL_WIDTH,
  type DetailSection,
  type FindingDetailView,
} from "../view-models/finding-detail-view.ts";
import type { FoldersView } from "../view-models/folders-view.ts";
import type {
  CleanupReportView,
  CleanupReviewView,
  CleanupGroup,
  CleanupRow,
} from "../view-models/cleanup-view.ts";
import {
  OVERVIEW_DETAIL_INDENT,
  OverviewDensity,
  type DiskOverviewView,
} from "../view-models/disk-overview-view.ts";
import type { GrowthView } from "../view-models/growth-view.ts";
import type {
  HelpView,
  PermissionGuideView,
  PromptPreviewView,
} from "../view-models/simple-views.ts";
import { ListRows, type ListHandlers } from "./list-rows.tsx";

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
      <Title text={view.title} />
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
          <text fg={colors.muted}>{UiCopy.diagnosis.noDetail}</text>
        ) : (
          <FindingDetailScreen view={detail} handlers={NO_HANDLERS} />
        )}
      </box>
    </box>
  );
}

function DetailSectionRow({ section }: { readonly section: DetailSection }): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="row" flexShrink={0} paddingBottom={1}>
      <box width={DETAIL_LABEL_WIDTH} flexShrink={0}>
        <text flexShrink={0} fg={colors.muted}>
          {section.label}
        </text>
      </box>
      <box flexDirection="column" flexGrow={1} flexShrink={1}>
        {section.lines.map((line) => (
          <text flexShrink={0} key={line.text} fg={colors[line.color]} wrapMode="word">
            {line.text}
          </text>
        ))}
      </box>
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

function HelpScreen({ view }: { readonly view: HelpView }): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column" flexGrow={1} overflow="hidden" paddingLeft={1} paddingRight={1}>
      <Title text={view.title} />
      <text flexShrink={0}> </text>
      {view.lines.map((line) => (
        <text flexShrink={0} key={line} fg={colors.text} wrapMode="word">
          {line}
        </text>
      ))}
      <text flexShrink={0}> </text>
      {view.keys.map((hint) => (
        <text flexShrink={0} key={hint.label}>
          <span fg={colors.text} attributes={TextAttributes.BOLD}>
            {hint.key.padEnd(view.keyColumnWidth)}
          </span>
          <span fg={colors.muted}>{hint.label}</span>
        </text>
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

function CleanupGroups({ groups }: { readonly groups: readonly CleanupGroup[] }): ReactNode {
  const colors = useColors();
  return groups.map((group) => (
    <box key={group.heading} flexDirection="column" flexShrink={0} paddingBottom={1}>
      <text flexShrink={0}>
        <span fg={colors[group.color]}>{group.size} </span>
        <span fg={colors.text} attributes={TextAttributes.BOLD}>
          {group.heading}
        </span>
      </text>
      <text flexShrink={0} fg={colors[group.color]}>
        {"         "}
        {group.consequence}
      </text>
      {group.places.map((place) => (
        <text key={place.target} flexShrink={0} fg={colors.muted}>
          {"   "}
          {place.size} {place.target}
        </text>
      ))}
      {group.morePlaces === undefined ? null : (
        <text flexShrink={0} fg={colors.muted}>
          {"            "}
          {group.morePlaces}
        </text>
      )}
    </box>
  ));
}

function CleanupReviewScreen({ view }: { readonly view: CleanupReviewView }): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column" flexGrow={1} overflow="hidden" paddingLeft={1} paddingRight={1}>
      <Title text={view.title} />
      <text flexShrink={0} fg={colors.caution}>
        {view.status ?? " "}
      </text>
      <CleanupGroups groups={view.groups} />
      {view.hiddenGroups === undefined ? null : (
        <text flexShrink={0} fg={colors.muted}>
          {view.hiddenGroups}
        </text>
      )}
      {view.blocked.length === 0 ? null : (
        <box flexDirection="column" paddingTop={1}>
          <text flexShrink={0} fg={colors.muted}>
            {view.blockedHeading}
          </text>
          <CleanupRows rows={view.blocked} />
        </box>
      )}
      <text flexShrink={0}> </text>
      {view.summary.map((line) => (
        <text flexShrink={0} key={line} fg={colors.text} wrapMode="word">
          {line}
        </text>
      ))}
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
          <text flexShrink={0} fg={colors.keep}>
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
