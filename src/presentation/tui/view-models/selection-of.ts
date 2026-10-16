import type { Classification } from "../../../domain/index.ts";
import { SelectionState } from "../../theme.ts";

export function selectionOf(
  places: readonly Classification[],
  cart: ReadonlyMap<string, unknown>,
): SelectionState {
  const selected = places.filter((place) => cart.has(place.path.toString())).length;
  if (selected === 0) return SelectionState.None;
  return selected === places.length ? SelectionState.All : SelectionState.Some;
}
