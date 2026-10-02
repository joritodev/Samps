import type { PaletteOptions } from "@/lib/theme/palette";

/**
 * Catálogo de temas. "samps" é o padrão atual e NÃO gera CSS (usa os tokens de
 * globals.css). Os demais viram `html[data-theme="id"]` em app/themes.css
 * (gerado por `npm run themes:gen`).
 */
export type ThemeDef = {
  id: string;
  label: string;
  hue: number;
  options?: PaletteOptions;
  /** Cor da miniatura no seletor (modo claro / escuro). */
  swatch: { light: string; dark: string };
};

export const DEFAULT_THEME_ID = "samps";

export const THEMES: readonly ThemeDef[] = [
  { id: "samps", label: "Samps", hue: 189, swatch: { light: "hsl(189 85% 31%)", dark: "hsl(188 70% 55%)" } },
  { id: "rosa", label: "Rosa", hue: 340, options: { tint: 0.6 }, swatch: { light: "hsl(340 64% 42%)", dark: "hsl(340 78% 68%)" } },
  { id: "coral", label: "Coral", hue: 14, options: { tint: 0.6 }, swatch: { light: "hsl(14 64% 40%)", dark: "hsl(14 78% 66%)" } },
  { id: "areia", label: "Areia", hue: 38, options: { tint: 0.8, accentSat: { light: 70, dark: 72 } }, swatch: { light: "hsl(38 70% 30%)", dark: "hsl(38 72% 66%)" } },
  { id: "verde", label: "Verde", hue: 156, swatch: { light: "hsl(156 64% 31%)", dark: "hsl(156 78% 68%)" } },
  { id: "azul", label: "Azul", hue: 214, swatch: { light: "hsl(214 64% 42%)", dark: "hsl(214 78% 68%)" } },
  { id: "lavanda", label: "Lavanda", hue: 266, swatch: { light: "hsl(266 64% 42%)", dark: "hsl(266 78% 68%)" } },
  { id: "grafite", label: "Grafite", hue: 220, options: { tint: 0.12, accentSat: { light: 14, dark: 18 } }, swatch: { light: "hsl(220 14% 30%)", dark: "hsl(220 18% 72%)" } },
] as const;

export const THEME_IDS = THEMES.map((t) => t.id) as readonly string[];
/** Temas que geram CSS (todos menos o padrão). */
export const GENERATED_THEMES = THEMES.filter((t) => t.id !== DEFAULT_THEME_ID);

/** Só ids do catálogo; o padrão vira `null` (sem atributo). */
export function parseTheme(v: unknown): string | null {
  return typeof v === "string" && v !== DEFAULT_THEME_ID && THEME_IDS.includes(v) ? v : null;
}
