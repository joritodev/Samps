import type { PlanCardStatus, PlanSectorSlug } from "./types";

/**
 * Regras do planejamento de exemplo montado a partir das demandas da simulação
 * (`prisma/seed-planning-demo.ts`). Tudo aqui é puro para poder ser testado.
 */

/** Posição inicial dos cards de exemplo. Cards reais usam posições pequenas. */
export const DEMO_POSITION_BASE = 1000;

/**
 * Card de exemplo: criado por script (sem autor), sem modelo, com cliente e ainda na posição de
 * exemplo. Quem arrasta ou edita um card reescreve a posição, e ele deixa de ser tratado como exemplo.
 */
export function isDemoCard(card: {
  createdById: string | null;
  templateId: string | null;
  clientName: string | null;
  position: number;
}) {
  return (
    card.createdById === null &&
    card.templateId === null &&
    card.clientName !== null &&
    card.position >= DEMO_POSITION_BASE
  );
}

const CLOSED = ["DONE", "PUBLISHED", "DELIVERED", "CANCELLED"];

export function isOpenDemandStatus(status: string) {
  return !CLOSED.includes(status);
}

/** Tipo do card no quadro a partir do tipo de conteúdo da demanda. */
export function demoKind(sector: PlanSectorSlug, contentSlug: string | null) {
  if (sector === "video") return "video";
  switch (contentSlug) {
    case "carrossel":
      return "carrossel";
    case "motion":
      return "video_template";
    default:
      return "peca";
  }
}

/** Duração em horas: usa a duração do vídeo quando existe, senão uma estimativa por tipo. */
export function demoHours(
  sector: PlanSectorSlug,
  contentSlug: string | null,
  durationSeconds: number | null,
) {
  if (sector === "video") {
    if (durationSeconds && durationSeconds > 0) {
      if (durationSeconds <= 30) return 1.5;
      if (durationSeconds <= 60) return 2;
      return 3;
    }
    return contentSlug === "stories" ? 1 : 2;
  }
  switch (contentSlug) {
    case "carrossel":
      return 1.5;
    case "motion":
      return 2;
    case "stories":
    case "estatico":
      return 0.5;
    default:
      return 1;
  }
}

const SIM_CLIENT_CATEGORY: [RegExp, string][] = [
  [/terra viva|vista verde/i, "Lançamento"],
  [/mendes|advog/i, "Institucional"],
];

/** Categoria do card: por cliente da simulação e por palavras do título. */
export function demoCategory(sector: PlanSectorSlug, clientName: string, title: string) {
  const allowed =
    sector === "design"
      ? ["Tráfego", "Orgânico", "Institucional", "Lançamento", "Vendas", "Outro"]
      : ["Tráfego", "Orgânico", "Institucional", "Corte", "Podcast", "Vendas", "Outro"];
  let category = "Orgânico";
  if (/campanha|promo|oferta|anúncio|anuncio|vagas|encomenda/i.test(title)) category = "Tráfego";
  for (const [pattern, value] of SIM_CLIENT_CATEGORY) {
    if (pattern.test(clientName)) category = value;
  }
  if (category === "Lançamento" && sector === "video") category = "Institucional";
  return allowed.includes(category) ? category : "Outro";
}

/** Status do card a partir do status da demanda aberta. */
export function demoStatusForDemand(status: string): PlanCardStatus {
  switch (status) {
    case "IN_PRODUCTION":
      return "EM_EDICAO";
    case "IN_REVIEW":
    case "ADJUSTMENTS":
      return "REVISAO";
    default:
      return "PROGRAMADO";
  }
}

/** Título curto: tira o mês entre parênteses que a simulação põe no fim. */
export function demoTitle(title: string) {
  const clean = title.replace(/\s*\((janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\)\s*$/i, "").trim();
  return (clean || title).slice(0, 120);
}

/** Dia da semana (1 = segunda … 7 = domingo) de uma data `AAAA-MM-DD`, sem fuso. */
export function weekdayOfKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay() || 7;
}

/** Duração de uma captação a partir de "HH:MM", com 3h quando não há horários. */
export function shootHours(startTime: string | null, endTime: string | null) {
  const parse = (value: string | null) => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value ?? "");
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  };
  const start = parse(startTime);
  const end = parse(endTime);
  if (start === null || end === null || end <= start) return 3;
  return Math.min(8, Math.round(((end - start) / 60) * 4) / 4);
}

const MEMBER_COLORS = ["#0c7e92", "#e08a5c", "#7c3aed", "#16833e", "#dc2828", "#a95c04"];

export function demoMemberColor(index: number) {
  return MEMBER_COLORS[index % MEMBER_COLORS.length]!;
}
