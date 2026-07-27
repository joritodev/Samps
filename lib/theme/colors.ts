export const COLOR_THEME_STORAGE_KEY = "samps-color-theme";

export type ColorThemeId =
  | "royal"
  | "violet"
  | "pink"
  | "lavender"
  | "sky"
  | "coral"
  | "teal";

export type ColorThemeOption = {
  id: ColorThemeId;
  label: string;
  /** Swatch fill (CSS color) */
  swatch: string;
};

export const COLOR_THEMES: ColorThemeOption[] = [
  { id: "royal", label: "Azul royal", swatch: "hsl(221 72% 42%)" },
  { id: "violet", label: "Violeta", swatch: "hsl(262 70% 48%)" },
  { id: "pink", label: "Rosa", swatch: "hsl(330 72% 52%)" },
  { id: "lavender", label: "Lavanda", swatch: "hsl(250 55% 62%)" },
  { id: "sky", label: "Céu", swatch: "hsl(199 78% 48%)" },
  { id: "coral", label: "Coral", swatch: "hsl(16 88% 55%)" },
  { id: "teal", label: "Teal", swatch: "hsl(173 58% 36%)" },
];

export const DEFAULT_COLOR_THEME: ColorThemeId = "royal";

export function isColorThemeId(value: string | null | undefined): value is ColorThemeId {
  return COLOR_THEMES.some((t) => t.id === value);
}
