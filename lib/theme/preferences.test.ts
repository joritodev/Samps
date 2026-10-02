import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  parseAccent,
  parseDensity,
  PREFERENCES_BOOT_SCRIPT,
  readPreferences,
} from "@/lib/theme/preferences";

describe("preferências", () => {
  it("aceita só chaves conhecidas", () => {
    expect(parseAccent("coral")).toBe("coral");
    expect(parseAccent("teal")).toBeNull();
    expect(parseAccent("red;} body{display:none")).toBeNull();
    expect(parseDensity("compact")).toBe("compact");
    expect(parseDensity("x")).toBe("comfortable");
  });
  it("lê do cookie", () => {
    expect(readPreferences("a=1; samps-accent=azul; samps-density=compact")).toEqual({
      accent: "azul",
      density: "compact",
    });
    expect(readPreferences("")).toEqual({ accent: null, density: "comfortable" });
  });
  it("script de boot é sintaticamente válido e só lista chaves do conjunto", () => {
    expect(() => new Function(PREFERENCES_BOOT_SCRIPT)).not.toThrow();
    expect(PREFERENCES_BOOT_SCRIPT).toContain('"violeta"');
    expect(PREFERENCES_BOOT_SCRIPT).not.toContain('"teal"');
  });
});

/* Contraste do texto do botão sobre cada cor de destaque, nos dois temas. */
function hslToLum(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const [r, g, b] = [f(0), f(8), f(4)].map((v) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const hsl = (v: string) => v.trim().split(/[\s%]+/).filter(Boolean).map(Number) as [number, number, number];

describe("contraste das cores de destaque", () => {
  const css = readFileSync("app/globals.css", "utf8");
  const light = Array.from(css.matchAll(/^\[data-accent="(\w+)"\][^{]*\{ --primary: ([^;]+);/gm));
  const dark = Array.from(css.matchAll(/^\.dark \[data-accent="(\w+)"\][^{]*\{ --primary: ([^;]+);/gm));
  const lightFg = hslToLum(...hsl("0 0% 100%"));
  const darkFg = hslToLum(...hsl("220 28% 8%"));

  it("encontrou as 6 cores nos dois temas", () => {
    expect(light).toHaveLength(6);
    expect(dark).toHaveLength(6);
  });
  it.each(light.map((m) => [m[1], m[2]]))("claro: %s ≥ 4.5:1", (_n, v) => {
    expect(ratio(hslToLum(...hsl(v)), lightFg)).toBeGreaterThanOrEqual(4.5);
  });
  it.each(dark.map((m) => [m[1], m[2]]))("escuro: %s ≥ 4.5:1", (_n, v) => {
    expect(ratio(hslToLum(...hsl(v)), darkFg)).toBeGreaterThanOrEqual(4.5);
  });
});
