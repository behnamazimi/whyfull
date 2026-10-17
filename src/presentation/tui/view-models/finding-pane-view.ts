import {
  FindingKind,
  type KnownItemFinding,
  type UnexplainedFolderFinding,
  type Finding,
} from "../../../domain/index.ts";
import { folderCopy } from "../../copy/folder-copy.ts";
import { ruleCopy } from "../../copy/rule-copy.ts";
import { isCleanableByWhyfull, ruleStatus, whoCleansUp } from "../../copy/rule-labels.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { wholeMonths } from "../../format/age-format.ts";
import { formatAge } from "../../format/age-format.ts";
import { formatByteSize } from "../../format/byte-size-format.ts";
import { formatCount } from "../../format/count-format.ts";
import { formatPath } from "../../format/path-format.ts";
import { keyLabel, UserAction } from "../../keymap.ts";
import { ColorRole, Glyph, safetyTone, SelectionState, unexplainedTone } from "../../theme.ts";
import type { AppState } from "../state/app-state.ts";
import { highRiskEntryAt } from "../state/cleanup-target.ts";
import { blockedNotice, highRiskBlockOf, warningLines } from "../state/high-risk-reducer.ts";
import {
  caution,
  muted,
  plain,
  type DetailAction,
  type DetailLine,
  type DetailSection,
  type DetailView,
} from "./detail-view.ts";
import { selectionOf } from "./selection-of.ts";

const action = (forAction: UserAction, label: string, active = false): DetailAction => ({
  key: keyLabel[forAction],
  label,
  action: forAction,
  active,
});

function toggleAction(selection: SelectionState, severalPlaces: boolean): DetailAction {
  switch (selection) {
    case SelectionState.All:
      return action(UserAction.ToggleCleanup, UiCopy.detail.inCleanup, true);
    case SelectionState.Some:
      return action(UserAction.ToggleCleanup, UiCopy.detail.addRest);
    case SelectionState.None:
      return action(
        UserAction.ToggleCleanup,
        severalPlaces ? UiCopy.detail.addEvery : UiCopy.detail.add,
      );
  }
}

function knownPane(state: AppState, finding: KnownItemFinding): DetailView {
  const { rule, locations } = finding;
  const copy = ruleCopy[rule.id];
  const how = copy.howToFreeSpace === undefined ? [] : [plain(copy.howToFreeSpace)];
  const months = String(wholeMonths(state.context.diagnosisPolicy.staleAfter));
  const untouched = finding.staleSize.isZero()
    ? []
    : [muted(UiCopy.diagnosis.untouched(formatByteSize(finding.staleSize), months))];
  const places = locations.length;
  const [first] = locations;
  const actions: DetailAction[] = [
    action(UserAction.Open, places > 1 ? UiCopy.detail.lookAtPlaces : UiCopy.detail.lookInside),
    ...(isCleanableByWhyfull(rule)
      ? [toggleAction(selectionOf(locations, state.cart), places > 1)]
      : []),
  ];
  return {
    title: copy.title,
    size: formatByteSize(finding.size),
    tone: safetyTone[rule.safety],
    verdict: ruleStatus(rule),
    meta: [
      UiCopy.categories[rule.category],
      ...(copy.alsoCalled === undefined ? [] : [UiCopy.detail.alsoCalled(copy.alsoCalled)]),
    ].join(Glyph.separator),
    sections: [
      { label: UiCopy.detail.whatItIs, lines: [plain(copy.whatItIs)] },
      { label: UiCopy.detail.ifRemoved, lines: [plain(copy.ifRemoved)] },
    ],
    notes: [plain(whoCleansUp(rule)), ...how, ...untouched],
    where:
      places > 1 || first === undefined
        ? UiCopy.detail.places(formatCount(places))
        : formatPath(first.path, state.context.home),
    actions,
  };
}

const unrecognizedNotes = (
  state: AppState,
  finding: UnexplainedFolderFinding,
  now: Date,
): readonly DetailLine[] => {
  const entry = highRiskEntryAt(state, finding.path, undefined);
  if (entry === undefined) return [muted(UiCopy.highRisk.detail.inviteOff)];
  const facts = muted(
    UiCopy.highRisk.detail.facts(formatAge(entry.lastModified, now), entry.fileCount),
  );
  const warnings = warningLines(state, entry).map(caution);
  const block = highRiskBlockOf(state, entry);
  const next =
    block !== undefined
      ? muted(blockedNotice(block))
      : state.cart.has(entry.path.toString())
        ? { text: UiCopy.highRisk.detail.added, color: ColorRole.danger }
        : plain(
            state.highRiskMode ? UiCopy.highRisk.detail.inviteOn : UiCopy.highRisk.detail.inviteOff,
          );
  return [facts, ...warnings, plain(UiCopy.highRisk.detail.ifDeleted), next];
};

function explanation(state: AppState, finding: UnexplainedFolderFinding): readonly DetailSection[] {
  const known = state.context.knownFolders.find((folder) => folder.path.equals(finding.path));
  if (known === undefined) return [];
  const copy = folderCopy[known.id];
  return [
    { label: UiCopy.detail.whatItIs, lines: [plain(copy.whatItIs)] },
    { label: UiCopy.detail.ifRemoved, lines: [plain(copy.ifRemoved)] },
  ];
}

function unrecognizedPane(
  state: AppState,
  finding: UnexplainedFolderFinding,
  now: Date,
): DetailView {
  const entry = highRiskEntryAt(state, finding.path, undefined);
  const canToggle =
    state.highRiskMode && entry !== undefined && highRiskBlockOf(state, entry) === undefined;
  const inCart = state.cart.has(finding.path.toString());
  return {
    title: finding.path.name,
    size: formatByteSize(finding.size),
    tone: unexplainedTone,
    verdict: UiCopy.highRisk.detail.notRecognized,
    meta: UiCopy.detail.unknownCategory,
    sections: explanation(state, finding),
    notes: unrecognizedNotes(state, finding, now),
    where: formatPath(finding.path, state.context.home),
    actions: [
      action(UserAction.Open, UiCopy.detail.lookInside),
      action(UserAction.AskAssistant, UiCopy.detail.askAssistant),
      ...(canToggle
        ? [
            action(
              UserAction.ToggleCleanup,
              inCart ? UiCopy.detail.inCleanupForGood : UiCopy.detail.addForGood,
              inCart,
            ),
          ]
        : []),
    ],
  };
}

export const findingPaneView = (state: AppState, finding: Finding, now: Date): DetailView =>
  finding.kind === FindingKind.KnownItem
    ? knownPane(state, finding)
    : unrecognizedPane(state, finding, now);
