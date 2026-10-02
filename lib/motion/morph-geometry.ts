/** Geometria pura do morph card → janela. Sem DOM, testável em jsdom. */

export type Rect = { top: number; left: number; width: number; height: number };

export type WindowRect = Rect & { radius: number; fullscreen: boolean };

export type WindowSizing = {
  maxW: number;
  maxH: number;
  /** Respiro mínimo entre a janela e a borda da tela. */
  margin: number;
  /** Abaixo desta largura a janela ocupa a tela toda. */
  fullscreenBelow: number;
  radius: number;
};

export const WINDOW_SIZES: Record<"md" | "lg", WindowSizing> = {
  md: { maxW: 880, maxH: 600, margin: 48, fullscreenBelow: 768, radius: 14 },
  lg: { maxW: 1040, maxH: 660, margin: 48, fullscreenBelow: 768, radius: 14 },
};

/** Onde a janela termina: centralizada no desktop, tela cheia no celular. */
export function windowRect(vw: number, vh: number, size: WindowSizing): WindowRect {
  if (vw < size.fullscreenBelow) {
    return { top: 0, left: 0, width: vw, height: vh, radius: 0, fullscreen: true };
  }
  const width = Math.min(size.maxW, vw - size.margin * 2);
  const height = Math.min(size.maxH, vh - size.margin * 2);
  return {
    top: Math.round((vh - height) / 2),
    left: Math.round((vw - width) / 2),
    width,
    height,
    radius: size.radius,
    fullscreen: false,
  };
}

/** Parte do retângulo que está dentro da tela, de 0 a 1. */
export function visibleRatio(r: Rect, vw: number, vh: number): number {
  const area = r.width * r.height;
  if (area <= 0) return 0;
  const w = Math.max(0, Math.min(r.left + r.width, vw) - Math.max(r.left, 0));
  const h = Math.max(0, Math.min(r.top + r.height, vh) - Math.max(r.top, 0));
  return (w * h) / area;
}

/** Recorta o retângulo à tela (card meio escondido na faixa rolável). */
export function clampToViewport(r: Rect, vw: number, vh: number): Rect {
  const left = Math.max(0, Math.min(r.left, vw));
  const top = Math.max(0, Math.min(r.top, vh));
  const right = Math.max(left, Math.min(r.left + r.width, vw));
  const bottom = Math.max(top, Math.min(r.top + r.height, vh));
  return { top, left, width: right - left, height: bottom - top };
}

const px = (n: number) => `${Math.round(n * 100) / 100}px`;

/** Quadros da casca: do retângulo A ao B, com o raio de borda junto. */
export function shellKeyframes(
  from: Rect,
  fromRadius: number,
  to: Rect,
  toRadius: number
): Keyframe[] {
  const frame = (r: Rect, radius: number): Keyframe => ({
    top: px(r.top),
    left: px(r.left),
    width: px(r.width),
    height: px(r.height),
    borderRadius: px(radius),
  });
  return [frame(from, fromRadius), frame(to, toRadius)];
}

/**
 * Deslocamento do título: onde ele está no card em relação a onde ele está
 * dentro da janela NO INSTANTE ZERO (a casca ainda está sobre o card).
 * `titleInShell` é o retângulo do título medido com a janela já no tamanho final.
 */
export function titleOffset(
  cardTitle: Rect,
  titleInWindow: Rect,
  windowFinal: Rect,
  cardRect: Rect,
  fontRatio: number
): { dx: number; dy: number; scale: number } {
  const startX = cardRect.left + (titleInWindow.left - windowFinal.left);
  const startY = cardRect.top + (titleInWindow.top - windowFinal.top);
  return {
    dx: cardTitle.left - startX,
    dy: cardTitle.top - startY,
    scale: fontRatio,
  };
}

/** Atraso escalonado da revelação do conteúdo, com teto. */
export function staggerDelay(index: number, base = 110, step = 35, max = 260): number {
  return Math.min(base + index * step, max);
}

/** Tempos e curvas do morph. Fonte única; o DESIGN.md documenta os mesmos valores. */
export const MORPH_TIMING = {
  open: 460,
  close: 300,
  scrim: 220,
  reveal: 240,
  revealOut: 120,
  /** Parte da duração em que o clone do card ainda é visível. */
  ghostShare: 0.35,
  /** Geometria da casca e título: arranque suave, sem frear no fim. */
  easeMorph: "cubic-bezier(0.32, 0.72, 0, 1)",
  /** Fades e revelação (o `out-soft` do projeto). */
  ease: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const;
