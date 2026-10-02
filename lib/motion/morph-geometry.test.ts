import { describe, expect, it } from "vitest";
import {
  clampToViewport,
  shellKeyframes,
  staggerDelay,
  titleOffset,
  visibleRatio,
  windowRect,
  WINDOW_SIZES,
} from "./morph-geometry";

describe("windowRect", () => {
  it("centraliza no desktop respeitando o tamanho máximo", () => {
    const r = windowRect(1440, 900, WINDOW_SIZES.lg);
    expect(r).toMatchObject({ width: 1040, height: 660, fullscreen: false, radius: 14 });
    expect(r.left).toBe(200);
    expect(r.top).toBe(120);
  });

  it("encolhe em telas pequenas mantendo a margem", () => {
    const r = windowRect(900, 600, WINDOW_SIZES.lg);
    expect(r.width).toBe(900 - 96);
    expect(r.height).toBe(600 - 96);
  });

  it("ocupa a tela toda abaixo de 768px, sem raio", () => {
    expect(windowRect(390, 844, WINDOW_SIZES.md)).toEqual({
      top: 0, left: 0, width: 390, height: 844, radius: 0, fullscreen: true,
    });
  });
});

describe("visibleRatio / clampToViewport", () => {
  const card = { top: 100, left: 100, width: 200, height: 100 };

  it("1 quando está inteiro na tela", () => {
    expect(visibleRatio(card, 1440, 900)).toBe(1);
  });

  it("metade quando metade saiu pela esquerda", () => {
    expect(visibleRatio({ ...card, left: -100 }, 1440, 900)).toBe(0.5);
  });

  it("0 quando está totalmente fora", () => {
    expect(visibleRatio({ ...card, top: 2000 }, 1440, 900)).toBe(0);
    expect(visibleRatio({ top: 0, left: 0, width: 0, height: 10 }, 100, 100)).toBe(0);
  });

  it("recorta à tela", () => {
    expect(clampToViewport({ top: -20, left: 1400, width: 100, height: 50 }, 1440, 900)).toEqual({
      top: 0, left: 1400, width: 40, height: 30,
    });
  });
});

describe("shellKeyframes", () => {
  it("devolve dois quadros com raio em px", () => {
    const [a, b] = shellKeyframes(
      { top: 10, left: 20, width: 30, height: 40 }, 12,
      { top: 0, left: 0, width: 100, height: 200 }, 14
    );
    expect(a).toEqual({ top: "10px", left: "20px", width: "30px", height: "40px", borderRadius: "12px" });
    expect(b).toMatchObject({ width: "100px", borderRadius: "14px" });
  });
});

describe("titleOffset", () => {
  it("parte da posição do título do card, não da janela final", () => {
    const card = { top: 300, left: 900, width: 244, height: 120 };
    const windowFinal = { top: 120, left: 200, width: 1040, height: 660 };
    const titleInWindow = { top: 140, left: 224, width: 400, height: 22 };
    const cardTitle = { top: 330, left: 914, width: 200, height: 40 };
    // Com a casca sobre o card, o título da janela estaria em (900+24, 300+20).
    expect(titleOffset(cardTitle, titleInWindow, windowFinal, card, 0.8)).toEqual({
      dx: 914 - 924,
      dy: 330 - 320,
      scale: 0.8,
    });
  });
});

describe("staggerDelay", () => {
  it("cresce por degrau e respeita o teto", () => {
    expect(staggerDelay(0)).toBe(110);
    expect(staggerDelay(2)).toBe(180);
    expect(staggerDelay(50)).toBe(260);
  });
});
