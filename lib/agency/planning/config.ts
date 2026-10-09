import type { PlanCardStatus, PlanSectorSlug } from "./types";

/**
 * Tipos, categorias, estilos e tempos do quadro. Valores e rótulos seguem o painel
 * original, porque o quadro precisa ficar idêntico ao que a equipe já usa.
 */

export const VIDEO_CATEGORIES = [
  "Tráfego",
  "Orgânico",
  "Institucional",
  "Corte",
  "Podcast",
  "Vendas",
  "Outro",
] as const;

export const DESIGN_CATEGORIES = [
  "Tráfego",
  "Orgânico",
  "Institucional",
  "Lançamento",
  "Vendas",
  "Outro",
] as const;

export const VIDEO_CARD_KINDS = [
  { value: "video", label: "Vídeo" },
  { value: "captacao", label: "Captação" },
  { value: "roteiro", label: "Roteiro" },
  { value: "planejamento", label: "Planejamento" },
  { value: "reuniao", label: "Reunião" },
  { value: "podcast", label: "Podcast" },
  { value: "outro", label: "Outra atividade" },
] as const;

export const DESIGN_CARD_KINDS = [
  { value: "peca", label: "Criativo estático" },
  { value: "carrossel", label: "Carrossel" },
  { value: "pdf", label: "PDF / apresentação" },
  { value: "stories", label: "Sequência de stories" },
  { value: "landing", label: "Landing page" },
  { value: "identidade_simples", label: "Identidade visual simples" },
  { value: "identidade_completa", label: "Identidade visual completa" },
  { value: "template_video", label: "Template de vídeo" },
  { value: "video_template", label: "Vídeos com template" },
  { value: "cronograma_7dias", label: "7 dias de cronograma" },
  { value: "cronograma_dia", label: "Cronogramas do dia" },
  { value: "reuniao", label: "Reunião" },
  { value: "outro", label: "Outra atividade" },
] as const;

export const PLAN_SECTOR_CONFIG: Record<
  PlanSectorSlug,
  {
    label: string;
    title: string;
    kinds: readonly { value: string; label: string }[];
    categories: readonly string[];
    defaultKind: string;
    defaultCategory: string;
    itemLabel: string;
  }
> = {
  video: {
    label: "Vídeo",
    title: "Painel de Produção Audiovisual",
    kinds: VIDEO_CARD_KINDS,
    categories: VIDEO_CATEGORIES,
    defaultKind: "video",
    defaultCategory: "Tráfego",
    itemLabel: "Vídeos",
  },
  design: {
    label: "Design",
    title: "Painel de Produção de Design",
    kinds: DESIGN_CARD_KINDS,
    categories: DESIGN_CATEGORIES,
    defaultKind: "peca",
    defaultCategory: "Tráfego",
    itemLabel: "Peças",
  },
};

export function isPlanSectorSlug(value: string): value is PlanSectorSlug {
  return value === "video" || value === "design";
}

export const PLAN_STATUSES: { value: PlanCardStatus; label: string }[] = [
  { value: "NAO_ALOCADO", label: "Não alocado" },
  { value: "PROGRAMADO", label: "Programado" },
  { value: "EM_EDICAO", label: "Em edição" },
  { value: "REVISAO", label: "Revisão" },
  { value: "CONCLUIDO", label: "Concluído" },
];

export function planStatusLabel(status: PlanCardStatus) {
  return PLAN_STATUSES.find((s) => s.value === status)?.label ?? status;
}

/**
 * Tempos-padrão do design (minutos). Os valores reais vêm dos presets do setor
 * (rótulo = `label`), então podem ser alterados sem mexer no código.
 */
export const DESIGN_TIME_DEFAULTS: {
  key: string;
  label: string;
  minutes: number;
  unit?: string;
}[] = [
  { key: "peca", label: "Criativo estático (por criativo)", minutes: 15, unit: "criativos" },
  { key: "carrossel", label: "Carrossel (por slide)", minutes: 15, unit: "slides" },
  { key: "pdf", label: "PDF / apresentação (por página)", minutes: 5, unit: "páginas" },
  { key: "stories", label: "Sequência de stories (~5)", minutes: 20, unit: "sequências" },
  { key: "landing", label: "Landing page (6–7 seções)", minutes: 150 },
  { key: "identidade_simples", label: "Identidade visual simples", minutes: 90 },
  { key: "identidade_completa", label: "Identidade visual completa", minutes: 150 },
  { key: "template_video", label: "Criação de template de vídeo", minutes: 20 },
  {
    key: "video_template",
    label: "Vídeo com template pronto (por vídeo)",
    minutes: 7,
    unit: "vídeos",
  },
  { key: "sem_identidade", label: "Adicional: sem identidade visual definida", minutes: 90 },
];

/** Minutos configurados para uma chave do design (preset salvo ou padrão). */
export function designMinutes(key: string, presets: { label: string; hours: number }[]) {
  const def = DESIGN_TIME_DEFAULTS.find((d) => d.key === key);
  if (!def) return null;
  const saved = presets.find((p) => p.label === def.label);
  return saved ? Math.round(saved.hours * 60) : def.minutes;
}

/** Opções rápidas de duração por tipo de card. */
export const KIND_DURATION_OPTIONS: Record<string, { label: string; hours: number }[]> = {
  captacao: [
    { label: "Captação 2h", hours: 2 },
    { label: "Captação 3h", hours: 3 },
    { label: "Captação 4h", hours: 4 },
    { label: "Captação 6h", hours: 6 },
  ],
  roteiro: [
    { label: "Roteiro 30 minutos", hours: 0.5 },
    { label: "Roteiro 1h", hours: 1 },
    { label: "Roteiro 2h", hours: 2 },
    { label: "Roteiro 3h", hours: 3 },
  ],
  cronograma_7dias: [
    { label: "7 dias de cronograma — 3h", hours: 3 },
    { label: "2h", hours: 2 },
    { label: "4h", hours: 4 },
    { label: "6h", hours: 6 },
  ],
  cronograma_dia: [
    { label: "Cronogramas do dia — 3h", hours: 3 },
    { label: "1h", hours: 1 },
    { label: "2h", hours: 2 },
    { label: "4h", hours: 4 },
  ],
};

/** Duração sugerida ao escolher o tipo (só preenche se a pessoa ainda não ajustou). */
export const KIND_DEFAULT_HOURS: Record<string, number> = {
  cronograma_7dias: 3,
  cronograma_dia: 3,
};

export const DURATION_PRESETS = [
  { label: "30 minutos", hours: 0.5 },
  { label: "Reel simples — 1h", hours: 1 },
  { label: "Vídeo intermediário — 2h", hours: 2 },
  { label: "Vídeo complexo — 3h", hours: 3 },
  { label: "Vídeo elaborado — 6h", hours: 6 },
];

/** Captação e roteiro usam cor cheia própria. */
export const KIND_STYLES: Record<
  string,
  { card: string; bar: string; title: string; hours: string; chip: string }
> = {
  captacao: {
    card: "border-rose-300 bg-rose-600 text-white",
    bar: "#7f1d1d",
    title: "text-white",
    hours: "text-white",
    chip: "bg-white/20 text-white",
  },
  roteiro: {
    card: "border-violet-300 bg-violet-600 text-white",
    bar: "#4c1d95",
    title: "text-white",
    hours: "text-white",
    chip: "bg-white/20 text-white",
  },
};

export const CATEGORY_STYLES: Record<string, string> = {
  "Tráfego": "bg-blue-100 text-blue-800 border-blue-300",
  "Orgânico": "bg-emerald-100 text-emerald-800 border-emerald-300",
  Institucional: "bg-sky-100 text-sky-900 border-sky-300",
  Corte: "bg-amber-100 text-amber-900 border-amber-300",
  Podcast: "bg-violet-100 text-violet-800 border-violet-300",
  Vendas: "bg-rose-100 text-rose-800 border-rose-300",
  "Lançamento": "bg-orange-100 text-orange-800 border-orange-300",
  Outro: "bg-slate-200 text-slate-800 border-slate-300",
};

/** Cor da faixa lateral do card por categoria. */
export const CATEGORY_BAR: Record<string, string> = {
  "Tráfego": "#2563eb",
  "Orgânico": "#059669",
  Institucional: "#0284c7",
  Corte: "#d97706",
  Podcast: "#7c3aed",
  Vendas: "#e11d48",
  "Lançamento": "#ea580c",
  Outro: "#64748b",
};
