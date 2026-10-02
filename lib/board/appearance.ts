/**
 * Aparência do quadro do cliente: cor de destaque e capa.
 * Conjunto fechado de chaves (sem cor livre, sem URL, sem upload): o que vai
 * para o banco é só a chave, e quem renderiza usa a tabela abaixo.
 * Guardado em `ClientBoard.config.appearance` (sem migração).
 */

export const BOARD_ACCENTS = [
  { id: "teal", label: "Teal", swatch: "hsl(189 85% 31%)" },
  { id: "azul", label: "Azul", swatch: "hsl(217 80% 42%)" },
  { id: "violeta", label: "Violeta", swatch: "hsl(258 55% 48%)" },
  { id: "rosa", label: "Rosa", swatch: "hsl(340 70% 44%)" },
  { id: "coral", label: "Coral", swatch: "hsl(18 72% 40%)" },
  { id: "verde", label: "Verde", swatch: "hsl(152 60% 30%)" },
  { id: "grafite", label: "Grafite", swatch: "hsl(220 20% 30%)" },
] as const;

export const BOARD_COVERS = [
  {
    id: "aurora",
    label: "Aurora",
    css: "linear-gradient(120deg, #0b7a8a 0%, #36b3a8 55%, #b7e4c7 100%)",
  },
  {
    id: "mare",
    label: "Maré",
    css: "linear-gradient(180deg, #8fd3f4 0%, #d6f1fb 45%, #f1dcaa 100%)",
  },
  {
    id: "noite",
    label: "Noite",
    css: "linear-gradient(180deg, #1b2a49 0%, #3b4f7d 60%, #d98458 100%)",
  },
  {
    id: "bosque",
    label: "Bosque",
    css: "radial-gradient(circle at 18% 30%, #3f9566 0 20%, transparent 21%), radial-gradient(circle at 62% 80%, #1f5c3a 0 26%, transparent 27%), radial-gradient(circle at 90% 20%, #4aa070 0 16%, transparent 17%), #2a6b46",
  },
  {
    id: "brasa",
    label: "Brasa",
    css: "linear-gradient(135deg, #7a2e1b 0%, #d9622b 60%, #f0b36b 100%)",
  },
  {
    id: "grafite",
    label: "Grafite",
    css: "linear-gradient(135deg, #1c2330 0%, #3a4558 100%)",
  },
] as const;

export type BoardAccentId = (typeof BOARD_ACCENTS)[number]["id"];
export type BoardCoverId = (typeof BOARD_COVERS)[number]["id"];

/** Foto de capa já tratada (recortada) e hospedada pelo nosso storage. */
export type BoardCoverImage = { url: string; w: number; h: number };

export type BoardAppearance = {
  accent: BoardAccentId | null;
  cover: BoardCoverId | null;
  coverImage: BoardCoverImage | null;
};

export const DEFAULT_APPEARANCE: BoardAppearance = {
  accent: null,
  cover: null,
  coverImage: null,
};

/** Só aceitamos imagem do nosso storage (Vercel Blob) ou, em dev, do disco local. */
export function isTrustedCoverUrl(url: unknown): url is string {
  if (typeof url !== "string" || url.length > 500) return false;
  if (url.startsWith("/uploads-dev/board-covers/") && !url.includes("..")) {
    return process.env.LOCAL_IMAGE_STORAGE === "1";
  }
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname.endsWith(".public.blob.vercel-storage.com") &&
      u.pathname.startsWith("/board-covers/")
    );
  } catch {
    return false;
  }
}

export function parseCoverImage(raw: unknown): BoardCoverImage | null {
  if (!raw || typeof raw !== "object") return null;
  const { url, w, h } = raw as Record<string, unknown>;
  if (!isTrustedCoverUrl(url)) return null;
  if (typeof w !== "number" || typeof h !== "number") return null;
  if (!(w > 0 && w <= 6000 && h > 0 && h <= 6000)) return null;
  return { url, w, h };
}

export function isAccentId(v: unknown): v is BoardAccentId {
  return BOARD_ACCENTS.some((a) => a.id === v);
}

export function isCoverId(v: unknown): v is BoardCoverId {
  return BOARD_COVERS.some((c) => c.id === v);
}

/** Lê `config.appearance` ignorando qualquer valor fora do conjunto fechado. */
export function parseAppearance(config: unknown): BoardAppearance {
  const raw =
    config && typeof config === "object"
      ? (config as { appearance?: unknown }).appearance
      : undefined;
  if (!raw || typeof raw !== "object") return DEFAULT_APPEARANCE;
  const { accent, cover, coverImage } = raw as Record<string, unknown>;
  return {
    accent: isAccentId(accent) ? accent : null,
    cover: isCoverId(cover) ? cover : null,
    coverImage: parseCoverImage(coverImage),
  };
}

/** Valida a entrada de uma action; `undefined` quando algo está fora do conjunto. */
export function sanitizeAppearance(input: {
  accent?: unknown;
  cover?: unknown;
}): Pick<BoardAppearance, "accent" | "cover"> | undefined {
  const accent = input.accent ?? null;
  const cover = input.cover ?? null;
  if (accent !== null && !isAccentId(accent)) return undefined;
  if (cover !== null && !isCoverId(cover)) return undefined;
  return { accent: accent as BoardAccentId | null, cover: cover as BoardCoverId | null };
}

export function coverCss(id: BoardCoverId | null): string | undefined {
  return BOARD_COVERS.find((c) => c.id === id)?.css;
}
