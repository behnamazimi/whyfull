import { CliRenderEvents } from "@opentui/core";
import { useRenderer } from "@opentui/react";
import { useCallback, useSyncExternalStore } from "react";
import { ThemeMode } from "../../theme.ts";

// The renderer asks the terminal for its background colour and reports again when the
// user switches between light and dark. Until it answers, assume a dark terminal.
export function useThemeMode(): ThemeMode {
  const renderer = useRenderer();
  const subscribe = useCallback(
    (onChange: () => void) => {
      renderer.on(CliRenderEvents.THEME_MODE, onChange);
      return () => {
        renderer.off(CliRenderEvents.THEME_MODE, onChange);
      };
    },
    [renderer],
  );
  return useSyncExternalStore(subscribe, () => renderer.themeMode) ?? ThemeMode.Dark;
}
