import { buildPalette } from "@/lib/theme/palette";
import { GENERATED_THEMES } from "@/lib/theme/themes";

const block = (selector: string, vars: Record<string, string>) =>
  `${selector} {\n${Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n")}\n}\n`;

/** CSS dos temas. Usado pelo script de geração e pelo teste de sincronia. */
export function buildThemesCss(): string {
  const header =
    "/* GERADO por `npm run themes:gen` a partir de lib/theme/themes.ts. Não editar à mão. */\n\n";
  return (
    header +
    GENERATED_THEMES.map((t) =>
      [
        block(`html[data-theme="${t.id}"]`, buildPalette(t.hue, "light", t.options)),
        block(`html.dark[data-theme="${t.id}"]`, buildPalette(t.hue, "dark", t.options)),
      ].join("\n")
    ).join("\n")
  );
}
