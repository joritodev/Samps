import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  blendedLuminance,
  contrast,
  contrastOfLuminances,
  luminance,
  parseHsl,
  type Hsl,
} from "@/lib/theme/contrast";
import { GENERATED_THEMES, type ThemeDef } from "@/lib/theme/themes";

const css = readFileSync("app/themes.css", "utf8");

function tokens(theme: ThemeDef, mode: "light" | "dark") {
  const selector = mode === "light" ? `html[data-theme="${theme.id}"]` : `html.dark[data-theme="${theme.id}"]`;
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("}", start));
  const out: Record<string, Hsl> = {};
  for (const m of Array.from(body.matchAll(/(--[\w-]+): ([^;]+);/g))) out[m[1]] = parseHsl(m[2]);
  return out;
}

/* Cores semânticas fixas (iguais em todos os temas) — de app/globals.css. */
const DESTRUCTIVE: Record<"light" | "dark", Hsl> = {
  light: parseHsl("0 72% 51%"),
  dark: parseHsl("0 62% 50%"),
};

/**
 * Piso da borda de atraso: a do tema Samps hoje (claro 1,91 / escuro 1,47) menos
 * 0,1 de tolerância. Não é um piso "bonito": o escuro já é fraco no padrão, e o
 * alerta não depende só da borda (texto vermelho ≥ 3:1 + ícone no card).
 */
const ALERT_BORDER_FLOOR = { light: 1.8, dark: 1.37 } as const;

const cases = GENERATED_THEMES.flatMap((t) =>
  (["light", "dark"] as const).map((mode) => [`${t.id} ${mode}`, t, mode] as const)
);

describe.each(cases)("contraste: %s", (_name, theme, mode) => {
  const t = tokens(theme, mode);
  const pair = (fg: string, bg: string) => contrast(t[fg], t[bg]);

  it("texto principal ≥ 7:1 sobre fundo, card e popover", () => {
    expect(pair("--foreground", "--background")).toBeGreaterThanOrEqual(7);
    expect(pair("--card-foreground", "--card")).toBeGreaterThanOrEqual(7);
    expect(pair("--popover-foreground", "--popover")).toBeGreaterThanOrEqual(7);
  });
  it("texto secundário ≥ 4,5:1 sobre fundo, card e área secundária", () => {
    expect(pair("--muted-foreground", "--background")).toBeGreaterThanOrEqual(4.5);
    expect(pair("--muted-foreground", "--card")).toBeGreaterThanOrEqual(4.5);
    expect(pair("--muted-foreground", "--muted")).toBeGreaterThanOrEqual(4.5);
  });
  it("destaque e menu lateral legíveis", () => {
    expect(pair("--primary-foreground", "--primary")).toBeGreaterThanOrEqual(4.5);
    expect(pair("--sidebar-primary-foreground", "--sidebar-primary")).toBeGreaterThanOrEqual(4.5);
    expect(pair("--sidebar-foreground", "--sidebar")).toBeGreaterThanOrEqual(4.5);
    expect(pair("--sidebar-accent-foreground", "--sidebar-accent")).toBeGreaterThanOrEqual(7);
  });
  it("borda visível sem pesar (≥ 1,15:1 contra o fundo)", () => {
    expect(pair("--border", "--background")).toBeGreaterThanOrEqual(1.15);
  });
  it("card se distingue do fundo ou tem borda para separar", () => {
    // O card pode ser quase igual ao fundo; a separação vem da borda (teste acima).
    expect(pair("--card", "--background")).toBeGreaterThanOrEqual(1);
  });
  it("borda de atraso (vermelho a 40%) não é pior que a do tema Samps", () => {
    const l = blendedLuminance(DESTRUCTIVE[mode], t["--card"], 0.4);
    expect(contrastOfLuminances(l, luminance(t["--card"]))).toBeGreaterThanOrEqual(
      ALERT_BORDER_FLOOR[mode]
    );
  });
  it("vermelho de atraso (texto) ≥ 3:1 sobre o card", () => {
    expect(contrast(DESTRUCTIVE[mode], t["--card"])).toBeGreaterThanOrEqual(3);
  });
});
