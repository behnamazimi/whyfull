import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { Glyph } from "../../theme.ts";
import { ScreenKind } from "../state/screen.ts";
import type { DialogBox, DialogView } from "../view-models/app-view.ts";
import type {
  BlockedRow,
  CleanupItem,
  CleanupReportView,
  CleanupReviewView,
  CleanupRow,
} from "../view-models/cleanup-view.ts";
import type { UserAction } from "../../keymap.ts";
import type { KeyStripView } from "../view-models/key-strip-view.ts";
import type { Viewport } from "../view-models/layout.ts";
import {
  HelpLineKind,
  type HelpLine,
  type HelpView,
  type PermissionGuideView,
  type PromptPreviewView,
} from "../view-models/simple-views.ts";
import { useColors } from "./color-scheme-context.ts";
import { DialogShell } from "./dialog-shell.tsx";
import { HighRiskDialog } from "./high-risk-dialog.tsx";
import { HeaderLine } from "./list-rows.tsx";

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
            <box key={`${String(index)}-${cell?.key ?? ""}`} flexGrow={1} flexBasis={0}>
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

function HelpContent({ view }: { readonly view: HelpView }): ReactNode {
  return (
    <box flexDirection="column" flexGrow={1} overflow="hidden">
      {view.lines.map((line, index) => (
        <HelpLineView key={index} line={line} keyColumnWidth={view.keyColumnWidth} />
      ))}
    </box>
  );
}

function PromptPreviewContent({ view }: { readonly view: PromptPreviewView }): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column" flexGrow={1} overflow="hidden">
      <text flexShrink={0} fg={colors.muted} wrapMode="word">
        {view.explanation}
      </text>
      <box
        border
        borderColor={colors.barTrack}
        flexDirection="column"
        paddingLeft={1}
        paddingRight={1}
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

function PermissionGuideContent({ view }: { readonly view: PermissionGuideView }): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column" flexGrow={1} overflow="hidden">
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

function CleanupReviewContent({ view }: { readonly view: CleanupReviewView }): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column" flexGrow={1} overflow="hidden">
      <box flexDirection="row" justifyContent="space-between" flexShrink={0}>
        <text fg={colors.muted}>{view.aside}</text>
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

function CleanupReportContent({ view }: { readonly view: CleanupReportView }): ReactNode {
  const colors = useColors();
  return (
    <box flexDirection="column" flexGrow={1} overflow="hidden">
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

function DialogContent({
  view,
}: {
  readonly view: Exclude<DialogView, { readonly kind: typeof ScreenKind.HighRiskDialog }>;
}): ReactNode {
  switch (view.kind) {
    case ScreenKind.Help:
      return <HelpContent view={view} />;
    case ScreenKind.PromptPreview:
      return <PromptPreviewContent view={view} />;
    case ScreenKind.PermissionGuide:
      return <PermissionGuideContent view={view} />;
    case ScreenKind.CleanupReview:
      return <CleanupReviewContent view={view} />;
    case ScreenKind.CleanupReport:
      return <CleanupReportContent view={view} />;
  }
}

/** The dialog drawn over the frame, if any. */
export function DialogLayer({
  dialog,
  viewport,
  keys,
  onAction,
}: {
  readonly dialog: { readonly view: DialogView; readonly box: DialogBox };
  readonly viewport: Viewport;
  readonly keys: KeyStripView;
  readonly onAction: (action: UserAction) => void;
}): ReactNode {
  const { view, box } = dialog;
  if (view.kind === ScreenKind.HighRiskDialog) {
    return <HighRiskDialog view={view} width={viewport.columns} height={viewport.rows} />;
  }
  return (
    <DialogShell title={view.title} box={box} viewport={viewport} keys={keys} onAction={onAction}>
      <DialogContent view={view} />
    </DialogShell>
  );
}
