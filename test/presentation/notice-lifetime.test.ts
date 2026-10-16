import { describe, expect, test } from "bun:test";
import { UserAction } from "../../src/presentation/keymap.ts";
import { initialAppState } from "../../src/presentation/tui/state/app-state.ts";
import { AppEventKind } from "../../src/presentation/tui/state/app-event.ts";
import { reduce } from "../../src/presentation/tui/state/reducer.ts";
import { sampleAppContext } from "../support/app-context.ts";

const MESSAGE = "A message the person may still be reading";
const withMessage = { ...initialAppState(sampleAppContext), notice: MESSAGE };
const request = (action: UserAction) =>
  reduce(withMessage, { kind: AppEventKind.ActionRequested, action }).state;

describe("how long a notice stays", () => {
  test("moving the cursor keeps it", () => {
    expect(request(UserAction.MoveDown).notice).toBe(MESSAGE);
    expect(request(UserAction.PageUp).notice).toBe(MESSAGE);
  });

  test("any other action clears it", () => {
    expect(request(UserAction.Help).notice).toBeUndefined();
  });
});
