import { contrast, parseHsl } from "@/lib/theme/contrast";

/**
 * Gerador de paleta de tema: a partir de um matiz devolve todos os tokens de
 * cor da moldura (neutros tingidos + destaque) para um modo. As cores
 * semânticas (perigo, aviso, sucesso, info) e a marca NÃO entram aqui.
 */

export type ThemeMode = "light" | "dark";

export type PaletteOptions = {
  /** Multiplica a saturação dos neutros (0–1). Matizes perto do vermelho usam menos. */
  tint?: number;
  /** Saturação do destaque, em %, por modo. */
  accentSat?: { light: number; dark: number };
};

/** Tetos de saturação dos neutros (spec: sem tintura forte em área grande). */
export const MAX_NEUTRAL_SAT = { light: 30, dark: 26 } as const;
/** Razão mínima do destaque contra o texto do botão. */
export const ACCENT_MIN_CONTRAST = 4.6;

const hsl = (h: number, s: number, l: number) =>
  `${Math.round(h)} ${+s.toFixed(1)}% ${+l.toFixed(1)}%`;

function accentFor(hue: number, mode: ThemeMode, sat: number) {
  if (mode === "light") {
    const white = parseHsl("0 0% 100%");
    let l = 42;
    while (l > 15 && contrast(parseHsl(hsl(hue, sat, l)), white) < ACCENT_MIN_CONTRAST) l -= 0.5;
    return { value: hsl(hue, sat, l), foreground: "0 0% 100%" };
  }
  const fg = hsl(hue, 30, 8);
  let l = 66;
  while (l < 90 && contrast(parseHsl(hsl(hue, sat, l)), parseHsl(fg)) < ACCENT_MIN_CONTRAST) l += 0.5;
  return { value: hsl(hue, sat, l), foreground: fg };
}

export function buildPalette(
  hue: number,
  mode: ThemeMode,
  options: PaletteOptions = {}
): Record<string, string> {
  const t = options.tint ?? 1;
  const sat = options.accentSat ?? { light: 64, dark: 78 };
  const accent = accentFor(hue, mode, sat[mode]);
  const P = accent.value;

  if (mode === "light") {
    const ink = hsl(hue, 45 * t, 10);
    return {
      "--background": hsl(hue, 30 * t, 97.5),
      "--foreground": ink,
      "--card": hsl(hue, 30 * t, 99.5),
      "--card-foreground": ink,
      "--popover": hsl(hue, 30 * t, 99.5),
      "--popover-foreground": ink,
      "--primary": P,
      "--primary-foreground": accent.foreground,
      "--secondary": hsl(hue, 28 * t, 94.5),
      "--secondary-foreground": ink,
      "--muted": hsl(hue, 28 * t, 94.5),
      "--muted-foreground": hsl(hue, 12 * t, 40),
      "--accent": hsl(hue, 28 * t, 94.5),
      "--accent-foreground": ink,
      "--border": hsl(hue, 22 * t, 89.5),
      "--input": hsl(hue, 20 * t, 85),
      "--ring": P,
      "--shell": hsl(hue, 24 * t, 94.5),
      "--sidebar": hsl(hue, 24 * t, 94.5),
      "--sidebar-foreground": hsl(hue, 10 * t, 38),
      "--sidebar-primary": P,
      "--sidebar-primary-foreground": accent.foreground,
      "--sidebar-accent": hsl(hue, 30 * t, 99.5),
      "--sidebar-accent-foreground": ink,
      "--sidebar-border": hsl(hue, 20 * t, 88),
      "--sidebar-ring": P,
      "--teal-light": P,
    };
  }

  const ink = hsl(hue, 30 * t, 97);
  return {
    "--background": hsl(hue, 22 * t, 8.5),
    "--foreground": ink,
    "--card": hsl(hue, 20 * t, 11.5),
    "--card-foreground": ink,
    "--popover": hsl(hue, 20 * t, 12.5),
    "--popover-foreground": ink,
    "--primary": P,
    "--primary-foreground": accent.foreground,
    "--secondary": hsl(hue, 18 * t, 15),
    "--secondary-foreground": ink,
    "--muted": hsl(hue, 18 * t, 15),
    "--muted-foreground": hsl(hue, 10 * t, 65),
    "--accent": hsl(hue, 18 * t, 15),
    "--accent-foreground": ink,
    "--border": hsl(hue, 16 * t, 19),
    "--input": hsl(hue, 16 * t, 23),
    "--ring": P,
    "--shell": hsl(hue, 26 * t, 6),
    "--sidebar": hsl(hue, 26 * t, 6),
    "--sidebar-foreground": hsl(hue, 10 * t, 64),
    "--sidebar-primary": P,
    "--sidebar-primary-foreground": accent.foreground,
    "--sidebar-accent": hsl(hue, 20 * t, 13),
    "--sidebar-accent-foreground": ink,
    "--sidebar-border": hsl(hue, 16 * t, 15),
    "--sidebar-ring": P,
    "--teal-light": P,
  };
}
