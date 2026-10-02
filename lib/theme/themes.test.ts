import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildThemesCss } from "@/lib/theme/themes-css";
import { DEFAULT_THEME_ID, GENERATED_THEMES, parseTheme, THEME_IDS, THEMES } from "@/lib/theme/themes";

describe("catálogo", () => {
  it("tem 8 temas, ids únicos e o padrão primeiro", () => {
    expect(THEMES).toHaveLength(8);
    expect(new Set(THEME_IDS).size).toBe(8);
    expect(THEMES[0].id).toBe(DEFAULT_THEME_ID);
  });
  it("parseTheme só aceita ids do catálogo", () => {
    expect(parseTheme("rosa")).toBe("rosa");
    expect(parseTheme("samps")).toBeNull();
    expect(parseTheme("x\"] { display:none")).toBeNull();
    expect(parseTheme(undefined)).toBeNull();
  });
});

describe("app/themes.css", () => {
  it("está idêntico ao gerado (rode `npm run themes:gen`)", () => {
    expect(readFileSync("app/themes.css", "utf8")).toBe(buildThemesCss());
  });
  it("tem claro e escuro de cada tema gerado", () => {
    const css = readFileSync("app/themes.css", "utf8");
    for (const t of GENERATED_THEMES) {
      expect(css).toContain(`html[data-theme="${t.id}"] {`);
      expect(css).toContain(`html.dark[data-theme="${t.id}"] {`);
    }
  });
});
