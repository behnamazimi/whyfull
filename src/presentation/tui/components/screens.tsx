import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { assertNever } from "../../../domain/index.ts";
import { Palette } from "../../theme.ts";
import { ScreenKind } from "../state/screen.ts";
import type { ScreenView } from "../view-models/app-view.ts";
import type { DiagnosisView } from "../view-models/diagnosis-view.ts";
import type { FindingDetailView } from "../view-models/finding-detail-view.ts";
import type { FoldersView } from "../view-models/folders-view.ts";
import type { DiskOverviewView } from "../view-models/disk-overview-view.ts";
import type {
  HelpView,
  PermissionGuideView,
  PromptPreviewView,
} from "../view-models/simple-views.ts";
import { ListRows, type ListHandlers } from "./list-rows.tsx";

function Title({ text, aside }: { readonly text: string; readonly aside?: string }): ReactNode {
  return (
    <text>
      <span fg={Palette.text} attributes={TextAttributes.BOLD}>
        {text}
      </span>
      {aside === undefined ? null : <span fg={Palette.muted}> {aside}</span>}
    </text>
  );
}

function DiagnosisScreen({
  view,
  handlers,
}: {
  readonly view: DiagnosisView;
  readonly handlers: ListHandlers;
}): ReactNode {
  return (
    <box flexDirection="column" flexGrow={1} paddingLeft={1} paddingRight={1}>
      <Title text={view.title} />
      <text fg={Palette.muted}>{view.subtitle ?? " "}</text>
      {view.emptyMessage === undefined ? (
        <ListRows view={view} handlers={handlers} />
      ) : (
        <text fg={Palette.muted}>{view.emptyMessage}</text>
      )}
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
  return (
    <box flexDirection="column" flexGrow={1} paddingLeft={1} paddingRight={1}>
      <Title text={view.title} aside={view.size} />
      <text fg={view.tone.color}>
        {view.tone.icon} {view.safetyLabel}
      </text>
      <text> </text>
      {view.sections.map((section) => (
        <box key={section.heading} flexDirection="column">
          <text fg={Palette.accent}>{section.heading}</text>
          <text fg={Palette.text} wrapMode="word">
            {section.body}
          </text>
        </box>
      ))}
      <text fg={Palette.muted}>{view.remedyNote}</text>
      <text> </text>
      <text fg={Palette.accent}>{view.locationsHeading}</text>
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
  return (
    <box flexDirection="column" flexGrow={1} paddingLeft={1} paddingRight={1}>
      <Title text={view.title} aside={view.size} />
      <text> </text>
      {view.emptyMessage === undefined ? (
        <ListRows view={view} handlers={handlers} />
      ) : (
        <text fg={Palette.muted}>{view.emptyMessage}</text>
      )}
    </box>
  );
}

function PromptPreviewScreen({ view }: { readonly view: PromptPreviewView }): ReactNode {
  return (
    <box flexDirection="column" flexGrow={1} paddingLeft={1} paddingRight={1}>
      <Title text={view.title} />
      <text fg={Palette.muted} wrapMode="word">
        {view.explanation}
      </text>
      <box border borderColor={Palette.barTrack} flexDirection="column" padding={1} flexGrow={1}>
        {view.lines.map((line, index) => (
          <text key={index} fg={Palette.text} wrapMode="word">
            {line.length === 0 ? " " : line}
          </text>
        ))}
      </box>
    </box>
  );
}

function HelpScreen({ view }: { readonly view: HelpView }): ReactNode {
  return (
    <box flexDirection="column" flexGrow={1} paddingLeft={1} paddingRight={1}>
      <Title text={view.title} />
      <text> </text>
      {view.lines.map((line) => (
        <text key={line} fg={Palette.text} wrapMode="word">
          {line}
        </text>
      ))}
      <text> </text>
      {view.keys.map((hint) => (
        <text key={hint.label}>
          <span fg={Palette.text} attributes={TextAttributes.BOLD}>
            {hint.key.padEnd(view.keyColumnWidth)}
          </span>
          <span fg={Palette.muted}>{hint.label}</span>
        </text>
      ))}
    </box>
  );
}

function DiskOverviewScreen({ view }: { readonly view: DiskOverviewView }): ReactNode {
  return (
    <box flexDirection="column" flexGrow={1} paddingLeft={1} paddingRight={1}>
      <Title text={view.title} />
      <text> </text>
      {view.loadingMessage === undefined ? null : (
        <text fg={Palette.muted}>{view.loadingMessage}</text>
      )}
      {view.rows.map((row) => (
        <box key={row.title} flexDirection="column" paddingBottom={1}>
          <text>
            <span fg={row.color}>
              {row.size} {row.bar}
            </span>
            <span fg={Palette.text} attributes={TextAttributes.BOLD}>
              {" "}
              {row.title}
            </span>
          </text>
          <text fg={Palette.muted} wrapMode="word">
            {"  "}
            {row.detail}
          </text>
        </box>
      ))}
      {view.notes.map((note) => (
        <text key={note} fg={Palette.caution} wrapMode="word">
          {note}
        </text>
      ))}
    </box>
  );
}

function PermissionGuideScreen({ view }: { readonly view: PermissionGuideView }): ReactNode {
  return (
    <box flexDirection="column" flexGrow={1} paddingLeft={1} paddingRight={1}>
      <Title text={view.title} />
      <text> </text>
      <text fg={Palette.text} wrapMode="word">
        {view.intro}
      </text>
      <text> </text>
      {view.steps.map((step) => (
        <text key={step} fg={Palette.text} wrapMode="word">
          {step}
        </text>
      ))}
      <text> </text>
      {view.status === undefined ? null : <text fg={Palette.safe}>{view.status}</text>}
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
    default:
      return assertNever(view);
  }
}
