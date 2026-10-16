import { createContext, useContext } from "react";
import { colorSchemes, ThemeMode, type ColorScheme } from "../../theme.ts";

export const ColorSchemeContext = createContext<ColorScheme>(colorSchemes[ThemeMode.Dark]);

export const useColors = (): ColorScheme => useContext(ColorSchemeContext);
