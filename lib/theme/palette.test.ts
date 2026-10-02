import { describe, expect, it } from "vitest";
import { contrast, parseHsl } from "@/lib/theme/contrast";
import { ACCENT_MIN_CONTRAST, buildPalette, MAX_NEUTRAL_SAT } from "@/lib/theme/palette";

const NEUTRALS = [
  "--background", "--card", "--popover", "--secondary", "--muted", "--accent",
  "--border", "--input", "--shell", "--sidebar", "--sidebar-accent", "--sidebar-border",
];
const REQUIRED = [...NEUTRALS, "--foreground", "--card-foreground", "--primary", "--primary-foreground",
  "--muted-foreground", "--ring", "--sidebar-foreground", "--sidebar-primary", "--sidebar-primary-foreground"];

describe("buildPalette", () => {
  it.each([0, 14, 38, 90, 156, 214, 266, 340])("tem todos os tokens (matiz %i)", (h) => {
    for (const mode of ["light", "dark"] as const) {
      const p = buildPalette(h, mode);
      for (const k of REQUIRED) expect(p[k], `${k} ${mode}`).toBeTruthy();
    }
  });

  it.each([0, 14, 38, 90, 156, 214, 266, 340])("destaque ≥ 4,6:1 nos dois modos (matiz %i)", (h) => {
    for (const mode of ["light", "dark"] as const) {
      const p = buildPalette(h, mode);
      expect(contrast(parseHsl(p["--primary"]), parseHsl(p["--primary-foreground"]))).toBeGreaterThanOrEqual(ACCENT_MIN_CONTRAST);
    }
  });

  it("neutros nunca passam do teto de saturação", () => {
    for (let h = 0; h < 360; h += 15) {
      for (const mode of ["light", "dark"] as const) {
        const p = buildPalette(h, mode);
        for (const k of NEUTRALS) expect(parseHsl(p[k])[1], `${k} ${mode} ${h}`).toBeLessThanOrEqual(MAX_NEUTRAL_SAT[mode]);
      }
    }
  });

  it("tint menor reduz a saturação dos neutros", () => {
    const full = parseHsl(buildPalette(340, "light", { tint: 1 })["--background"])[1];
    const low = parseHsl(buildPalette(340, "light", { tint: 0.6 })["--background"])[1];
    expect(low).toBeLessThan(full);
  });

  it("é determinística", () => {
    expect(buildPalette(214, "dark")).toEqual(buildPalette(214, "dark"));
  });
});
