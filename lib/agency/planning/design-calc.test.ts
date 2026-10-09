import { describe, expect, it } from "vitest";
import { computeDesignTime } from "./design-calc";

const calc = (over: Partial<Parameters<typeof computeDesignTime>[0]> = {}, presets: { label: string; hours: number }[] = []) =>
  computeDesignTime({ kind: "carrossel", quantity: 1, noIdentity: false, newTemplate: false, ...over }, presets);

describe("calculadora do design", () => {
  it("quantidade × tempo por unidade", () => {
    expect(calc({ quantity: 6 })).toMatchObject({ totalMinutes: 90, hours: 1.5, summary: "6 slides × 15 min" });
  });
  it("tipos sem unidade ignoram a quantidade", () => {
    expect(calc({ kind: "landing", quantity: 5 })).toMatchObject({ totalMinutes: 150, unit: null });
  });
  it("sem identidade soma o adicional", () => {
    expect(calc({ kind: "peca", quantity: 2, noIdentity: true })).toMatchObject({
      totalMinutes: 2 * 15 + 90,
      summary: "2 criativos × 15 min + 90 min (identidade)",
    });
  });
  it("template novo só vale para vídeo com template", () => {
    expect(calc({ kind: "video_template", quantity: 4, newTemplate: true })?.totalMinutes).toBe(4 * 7 + 20);
    expect(calc({ kind: "carrossel", newTemplate: true })?.totalMinutes).toBe(15);
  });
  it("usa os tempos salvos nos presets do setor", () => {
    const presets = [
      { label: "Carrossel (por slide)", hours: 0.5 },
      { label: "Adicional: sem identidade visual definida", hours: 1 },
    ];
    expect(calc({ quantity: 2, noIdentity: true }, presets)?.totalMinutes).toBe(2 * 30 + 60);
  });
  it("quantidade inválida vira 1; tipo sem tempo devolve null", () => {
    expect(calc({ quantity: 0 })?.totalMinutes).toBe(15);
    expect(calc({ quantity: Number.NaN })?.totalMinutes).toBe(15);
    expect(calc({ kind: "reuniao" })).toBeNull();
  });
});
