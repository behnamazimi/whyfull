import { ChangeDirection, ScanScopeKind } from "../../../domain/index.ts";
import { UiCopy } from "../../copy/ui-copy.ts";
import { formatPath } from "../../format/path-format.ts";
import { keyLabel, UserAction } from "../../keymap.ts";
import { Glyph } from "../../theme.ts";
import { ScanStatus, type AppState } from "../state/app-state.ts";
import { Tab, tabOf, tabOrder } from "../state/screen.ts";
import { Layout, truncateMiddle, type Viewport } from "./layout.ts";

export interface TabView {
  readonly tab: Tab;
  readonly key: string;
  readonly label: string;
  readonly active: boolean;
  /** A mark after the label when there is news on that tab. */
  readonly badge: string;
  /** What choosing the tab does, whether by key or by click. */
  readonly action: UserAction;
}

export interface TabsView {
  readonly tabs: readonly TabView[];
  readonly highRisk: string | undefined;
  readonly scope: string;
  readonly rule: string | undefined;
}

const SECTION_GAP_WIDTH = 2;
const MINIMUM_SCOPE_WIDTH = 4;
/** The spaces around a tab and the one between its key and its label. */
const TAB_FRAME_WIDTH = 3;
/** The key, the label, the badge and the space around them, as the tab bar draws them. */
const tabWidth = (tab: TabView): number =>
  tab.key.length +
  tab.label.length +
  (tab.badge === "" ? 0 : tab.badge.length + 1) +
  TAB_FRAME_WIDTH;

const tabAction: Readonly<Record<Tab, UserAction>> = {
  [Tab.Cleanup]: UserAction.ShowCleanup,
  [Tab.Folders]: UserAction.BrowseFolders,
  [Tab.Disk]: UserAction.ShowDiskOverview,
  [Tab.Grew]: UserAction.ShowGrowth,
};

function hasMeaningfulGrowth(state: AppState): boolean {
  const { growth, context } = state;
  return (
    growth?.total.direction === ChangeDirection.Grew &&
    growth.total.amount.isAtLeast(context.historyPolicy.growthMinimumSize)
  );
}

function scopeLabel(state: AppState): string {
  const { scope, context } = state;
  if (scope.kind === ScanScopeKind.WholeDisk) return UiCopy.frame.scope.wholeDisk;
  return scope.root.equals(context.home)
    ? UiCopy.frame.scope.homeFolder
    : formatPath(scope.root, context.home);
}

export function tabsView(state: AppState, viewport: Viewport, rule: string | undefined): TabsView {
  const current = tabOf(state.screen);
  const tabs = tabOrder.map((tab) => ({
    tab,
    key: keyLabel[tabAction[tab]],
    label: UiCopy.tabs[tab],
    active: tab === current,
    badge: tab === Tab.Grew && hasMeaningfulGrowth(state) ? Glyph.news : "",
    action: tabAction[tab],
  }));
  const highRisk = state.highRiskMode ? UiCopy.highRisk.badge : undefined;
  const taken =
    UiCopy.appName.length +
    SECTION_GAP_WIDTH +
    tabs.reduce((total, tab) => total + tabWidth(tab) + Layout.tabGap, 0) +
    (highRisk === undefined ? 0 : highRisk.length + SECTION_GAP_WIDTH);
  const room = viewport.columns - Layout.horizontalPadding - taken - SECTION_GAP_WIDTH;
  const label = scopeLabel(state);
  const prefix =
    state.scan.status === ScanStatus.Running ? UiCopy.frame.looking("") : UiCopy.frame.scanned("");
  return {
    tabs,
    highRisk,
    scope:
      room < prefix.length + MINIMUM_SCOPE_WIDTH
        ? ""
        : prefix + truncateMiddle(label, room - prefix.length),
    rule,
  };
}
