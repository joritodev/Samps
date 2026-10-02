/**
 * Geometria do recorte da capa (compartilhada entre navegador e servidor).
 * O recorte é guardado em coordenadas normalizadas (0–1) da foto original:
 * `x`/`y` = canto superior esquerdo, `w` = largura. A altura sai da proporção.
 */

/** Proporção largura:altura da faixa da capa. */
export const COVER_RATIO = 12;
/** Largura final máxima da imagem guardada. */
export const COVER_MAX_WIDTH = 2400;

export type NormalizedCrop = { x: number; y: number; w: number };
export type PixelRect = { left: number; top: number; width: number; height: number };

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/** Menor largura de recorte permitida (limita o zoom máximo). */
export const MIN_CROP_WIDTH = 0.25;

/** Altura do recorte, em fração da altura da foto. */
export function cropHeightFraction(w: number, imgW: number, imgH: number) {
  return (w * imgW) / COVER_RATIO / imgH;
}

/**
 * Ajusta qualquer recorte para caber dentro da foto, mantendo a proporção.
 * Entradas inválidas (NaN, infinito) caem no recorte máximo centralizado.
 */
export function clampCrop(
  crop: Partial<NormalizedCrop>,
  imgW: number,
  imgH: number
): NormalizedCrop {
  const finite = (n: unknown): n is number =>
    typeof n === "number" && Number.isFinite(n);
  // A altura da foto limita a largura máxima do recorte.
  const maxW = Math.min(1, (imgH * COVER_RATIO) / imgW);
  const w = clamp(finite(crop.w) ? crop.w : maxW, Math.min(MIN_CROP_WIDTH, maxW), maxW);
  const h = cropHeightFraction(w, imgW, imgH);
  const x = clamp(finite(crop.x) ? crop.x : (1 - w) / 2, 0, 1 - w);
  const y = clamp(finite(crop.y) ? crop.y : (1 - h) / 2, 0, 1 - h);
  return { x, y, w };
}

export function cropToPixels(
  crop: NormalizedCrop,
  imgW: number,
  imgH: number
): PixelRect {
  const c = clampCrop(crop, imgW, imgH);
  const width = Math.max(1, Math.round(c.w * imgW));
  const height = Math.max(1, Math.min(imgH, Math.round(width / COVER_RATIO)));
  const left = Math.min(imgW - width, Math.round(c.x * imgW));
  const top = Math.min(imgH - height, Math.round(c.y * imgH));
  return { left, top, width, height };
}
