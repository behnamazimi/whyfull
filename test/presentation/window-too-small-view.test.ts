import { describe, expect, test } from "bun:test";
import { initialAppState } from "../../src/presentation/tui/state/app-state.ts";
import { MinimumViewport } from "../../src/presentation/tui/view-models/layout.ts";
import { windowTooSmallView } from "../../src/presentation/tui/view-models/window-too-small-view.ts";
import { sampleAppContext } from "../support/app-context.ts";

const state = initialAppState(sampleAppContext);
const NARROW_COLUMNS = 60;
const SHORT_ROWS = 12;

describe("windowTooSmallView", () => {
  test("is absent when the window is exactly the minimum size", () => {
    expect(windowTooSmallView(state, MinimumViewport)).toBeUndefined();
  });

  test("appears when the window is too narrow", () => {
    expect(
      windowTooSmallView(state, { ...MinimumViewport, columns: NARROW_COLUMNS }),
    ).toBeDefined();
  });

  test("appears when the window is too short", () => {
    expect(windowTooSmallView(state, { ...MinimumViewport, rows: SHORT_ROWS })).toBeDefined();
  });

  test("offers a way out", () => {
    const view = windowTooSmallView(state, { columns: NARROW_COLUMNS, rows: SHORT_ROWS });
    expect(view?.quit).toBeDefined();
  });
});
