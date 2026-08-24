/** Space-separated HSL channels without `hsl()` — shadcn style: "H S% L%" */
export type HslChannels = string;

export const sampsBrand = {
  ink: "220 48% 8%", // #0B1220
  paper: "220 20% 97%", // #F7F8FA
  surface: "0 0% 100%", // #FFFFFF
  cyan: "188 63% 48%", // #2EB5C9
  ember: "21 68% 62%", // #E08A5C
  line: "218 24% 88%", // #D8DEE8
} as const;

export const sampsBrandDark = {
  ink: "210 40% 98%",
  paper: "220 28% 7%",
  surface: "220 24% 10%",
  cyan: "188 70% 55%",
  ember: "21 75% 65%",
  line: "220 14% 20%",
} as const;

/** Maps to CSS variables consumed by Tailwind/shadcn */
export const lightSemantic = {
  background: sampsBrand.paper,
  foreground: sampsBrand.ink,
  card: sampsBrand.surface,
  "card-foreground": sampsBrand.ink,
  primary: sampsBrand.cyan,
  "primary-foreground": "0 0% 100%",
  brand: sampsBrand.ember,
  "brand-foreground": "0 0% 100%",
  border: sampsBrand.line,
  input: sampsBrand.line,
  ring: sampsBrand.cyan,
  muted: "220 16% 94%",
  "muted-foreground": "220 12% 40%",
  secondary: "220 16% 94%",
  "secondary-foreground": sampsBrand.ink,
  accent: "220 16% 94%",
  "accent-foreground": sampsBrand.ink,
  destructive: "0 72% 51%",
  "destructive-foreground": "0 0% 100%",
  success: "142 71% 36%",
  warning: "32 95% 44%",
} as const;

export const darkSemantic = {
  background: sampsBrandDark.paper,
  foreground: sampsBrandDark.ink,
  card: sampsBrandDark.surface,
  "card-foreground": sampsBrandDark.ink,
  primary: sampsBrandDark.cyan,
  "primary-foreground": "220 28% 8%",
  brand: sampsBrandDark.ember,
  "brand-foreground": "0 0% 100%",
  border: sampsBrandDark.line,
  input: sampsBrandDark.line,
  ring: sampsBrandDark.cyan,
  muted: "220 16% 16%",
  "muted-foreground": "220 12% 65%",
  secondary: "220 16% 16%",
  "secondary-foreground": sampsBrandDark.ink,
  accent: "220 16% 16%",
  "accent-foreground": sampsBrandDark.ink,
  destructive: "0 62% 45%",
  "destructive-foreground": "0 0% 100%",
  success: "142 60% 45%",
  warning: "32 90% 55%",
} as const;
