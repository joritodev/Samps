/**
 * Demo content types for video briefing (fatia 3.3 provisória).
 * Lista oficial da Samps substitui estes slugs quando chegar.
 */
export const VIDEO_DEMO_CONTENT_TYPE_SLUGS = [
  "reels-demo",
  "stories-video-demo",
  "video-institucional-demo",
  "bastidores-demo",
  "captacao-bruta-demo",
  "youtube-curto-demo",
  "podcast-clip-demo",
  "motion-demo",
] as const;

export const VIDEO_DEMO_CONTENT_TYPES: {
  name: string;
  slug: (typeof VIDEO_DEMO_CONTENT_TYPE_SLUGS)[number];
  sortOrder: number;
}[] = [
  { name: "Reels (demo)", slug: "reels-demo", sortOrder: 20 },
  { name: "Stories em vídeo (demo)", slug: "stories-video-demo", sortOrder: 21 },
  {
    name: "Vídeo institucional (demo)",
    slug: "video-institucional-demo",
    sortOrder: 22,
  },
  { name: "Bastidores / making of (demo)", slug: "bastidores-demo", sortOrder: 23 },
  { name: "Captação bruta (demo)", slug: "captacao-bruta-demo", sortOrder: 24 },
  { name: "YouTube curto (demo)", slug: "youtube-curto-demo", sortOrder: 25 },
  { name: "Podcast — clip (demo)", slug: "podcast-clip-demo", sortOrder: 26 },
  { name: "Motion (demo)", slug: "motion-demo", sortOrder: 27 },
];

export function isVideoDemoContentType(slug: string | null | undefined) {
  if (!slug) return false;
  return (VIDEO_DEMO_CONTENT_TYPE_SLUGS as readonly string[]).includes(slug);
}

/** Campos obrigatórios no briefing demo para categorias de vídeo. */
export function videoDemoMissingFields(input: {
  contentTypeSlug?: string | null;
  demandType?: string | null;
  durationSeconds?: number | null;
  format?: string | null;
  orientation?: string | null;
}) {
  const isVideo =
    isVideoDemoContentType(input.contentTypeSlug) ||
    input.demandType === "REEL" ||
    input.demandType === "VIDEO";

  if (!isVideo) return [];

  const missing: string[] = [];
  if (
    input.durationSeconds == null ||
    !Number.isFinite(input.durationSeconds) ||
    input.durationSeconds <= 0
  ) {
    missing.push("duração (segundos)");
  }
  if (!input.format?.trim() && !input.orientation?.trim()) {
    missing.push("formato/orientação (ex.: 9:16 vertical)");
  }
  return missing;
}
