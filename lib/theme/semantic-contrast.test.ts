import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrast, parseHsl } from "@/lib/theme/contrast";
import { GENERATED_THEMES } from "@/lib/theme/themes";

/** Cores semânticas fixas (urgente = terracota, celebração) legíveis sobre o card de todo tema. */
const globals = readFileSync("app/globals.css", "utf8");
const themes = readFileSync("app/themes.css", "utf8");

function token(css: string, block: RegExp, name: string) {
  const m = css.match(block);
  const v = m?.[0].match(new RegExp(`${name}: ([^;]+);`));
  if (!v) throw new Error(`token ${name} não encontrado`);
  return parseHsl(v[1]);
}

const rootBlock = /^  :root \{[\s\S]*?^  \}/m;
const darkBlock = /^  \.dark \{[\s\S]*?^  \}/m;

const urgent = {
  light: token(globals, rootBlock, "--urgent"),
  dark: token(globals, darkBlock, "--urgent"),
};
const celebration = {
  light: token(globals, rootBlock, "--celebration"),
  dark: token(globals, darkBlock, "--celebration"),
};

function card(themeId: string | null, mode: "light" | "dark") {
  if (!themeId) return token(globals, mode === "light" ? rootBlock : darkBlock, "--card");
  const sel = mode === "light" ? `html[data-theme="${themeId}"] {` : `html.dark[data-theme="${themeId}"] {`;
  const start = themes.indexOf(sel);
  const body = themes.slice(start, themes.indexOf("}", start));
  return parseHsl(body.match(/--card: ([^;]+);/)![1]);
}

describe.each([null, ...GENERATED_THEMES.map((t) => t.id)])("tema %s", (id) => {
  for (const mode of ["light", "dark"] as const) {
    it(`urgente e celebração ≥ 4,5:1 sobre o card (${mode})`, () => {
      const bg = card(id, mode);
      expect(contrast(urgent[mode], bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(celebration[mode], bg)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
