"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  COLOR_THEME_STORAGE_KEY,
  DEFAULT_COLOR_THEME,
  isColorThemeId,
  type ColorThemeId,
} from "@/lib/theme/colors";

type ColorThemeContextValue = {
  colorTheme: ColorThemeId;
  setColorTheme: (id: ColorThemeId) => void;
  mounted: boolean;
};

const ColorThemeContext = createContext<ColorThemeContextValue | null>(null);

function applyColorTheme(id: ColorThemeId) {
  document.documentElement.setAttribute("data-color-theme", id);
}

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] =
    useState<ColorThemeId>(DEFAULT_COLOR_THEME);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COLOR_THEME_STORAGE_KEY);
    const next = isColorThemeId(stored) ? stored : DEFAULT_COLOR_THEME;
    setColorThemeState(next);
    applyColorTheme(next);
    setMounted(true);
  }, []);

  const setColorTheme = useCallback((id: ColorThemeId) => {
    setColorThemeState(id);
    applyColorTheme(id);
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, id);
  }, []);

  const value = useMemo(
    () => ({ colorTheme, setColorTheme, mounted }),
    [colorTheme, setColorTheme, mounted]
  );

  return (
    <ColorThemeContext.Provider value={value}>
      {children}
    </ColorThemeContext.Provider>
  );
}

export function useColorTheme() {
  const ctx = useContext(ColorThemeContext);
  if (!ctx) {
    throw new Error("useColorTheme must be used within ColorThemeProvider");
  }
  return ctx;
}
