import { describe, expect, it } from "vitest";
import { clampCrop, cropToPixels, COVER_RATIO } from "@/lib/board/cover-crop";

describe("clampCrop", () => {
  it("mantém um recorte válido", () => {
    expect(clampCrop({ x: 0.1, y: 0.2, w: 0.5 }, 3000, 2000)).toEqual({ x: 0.1, y: 0.2, w: 0.5 });
  });
  it("não deixa sair da foto", () => {
    const c = clampCrop({ x: 0.9, y: 5, w: 0.5 }, 3000, 2000);
    expect(c.x).toBeCloseTo(0.5);
    const h = (c.w * 3000) / COVER_RATIO / 2000;
    expect(c.y + h).toBeLessThanOrEqual(1 + 1e-9);
  });
  it("limita zoom máximo e mínimo", () => {
    expect(clampCrop({ w: 5 }, 3000, 2000).w).toBe(1);
    expect(clampCrop({ w: 0.001 }, 3000, 2000).w).toBe(0.25);
  });
  it("foto muito baixa: largura máxima respeita a altura", () => {
    const c = clampCrop({ w: 1 }, 2400, 100);
    expect(c.w).toBeCloseTo((100 * COVER_RATIO) / 2400);
  });
  it("trata NaN/Infinity como recorte padrão", () => {
    const c = clampCrop({ x: NaN, y: Infinity, w: NaN }, 3000, 2000);
    expect(Number.isFinite(c.x + c.y + c.w)).toBe(true);
  });
});

describe("cropToPixels", () => {
  it("devolve retângulo inteiro dentro da imagem na proporção da faixa", () => {
    const r = cropToPixels({ x: 0, y: 0.4, w: 1 }, 3000, 2000);
    expect(r.width).toBe(3000);
    expect(r.height).toBe(250);
    expect(r.top + r.height).toBeLessThanOrEqual(2000);
  });
});
