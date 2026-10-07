function channel(value: number): number {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Luminância relativa (WCAG) de `#rgb` ou `#rrggbb`; `null` se não for uma cor hexadecimal. */
export function luminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const full = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  const n = parseInt(full, 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/**
 * Cor de texto legível sobre `background`: branco ou quase preto, o que der mais contraste.
 * A cor da marca é livre (cada cliente tem a sua), então o texto não pode ser sempre branco.
 */
export function readableInk(background: string | null | undefined): string {
  const lum = background ? luminance(background) : null;
  if (lum === null) return "#ffffff";
  const white = 1.05 / (lum + 0.05);
  const dark = (lum + 0.05) / 0.0575; // contra #0b1220
  return white >= dark ? "#ffffff" : "#0b1220";
}
