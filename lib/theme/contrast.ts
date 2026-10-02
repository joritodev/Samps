/** Utilitários de contraste (WCAG) sobre canais HSL no formato "H S% L%". */

export type Hsl = [number, number, number];

export function parseHsl(v: string): Hsl {
  const [h, s, l] = v.trim().split(/[\s%]+/).filter(Boolean).map(Number);
  return [h, s, l];
}

export function hslToRgb([h, s, l]: Hsl): [number, number, number] {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) =>
    lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

function channel(v: number) {
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function luminance(color: Hsl): number {
  const [r, g, b] = hslToRgb(color).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: Hsl, b: Hsl): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Mistura `top` sobre `base` com opacidade `alpha` (em RGB), devolvendo luminância. */
export function blendedLuminance(top: Hsl, base: Hsl, alpha: number): number {
  const t = hslToRgb(top);
  const b = hslToRgb(base);
  const [r, g, bl] = [0, 1, 2].map((i) => channel(t[i] * alpha + b[i] * (1 - alpha)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

export function contrastOfLuminances(la: number, lb: number) {
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
