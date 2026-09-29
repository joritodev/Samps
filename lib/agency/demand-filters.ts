import { DemandStatus, type Prisma } from "@prisma/client";

/** Status que ainda contam como trabalho em aberto. */
export const OPEN_EXCLUDED: DemandStatus[] = [
  DemandStatus.DONE,
  DemandStatus.CANCELLED,
  DemandStatus.PUBLISHED,
];

/** Etapas do ciclo da demanda, na ordem em que o trabalho anda. */
export const FLOW_STAGES = [
  {
    key: "briefing",
    label: "Briefing",
    statuses: [
      DemandStatus.PENDING_PLANNING,
      DemandStatus.PLANNING,
      DemandStatus.OPEN,
      DemandStatus.BACKLOG,
    ],
  },
  {
    key: "a-fazer",
    label: "A fazer",
    statuses: [DemandStatus.AVAILABLE, DemandStatus.DEMANDED],
  },
  { key: "producao", label: "Produção", statuses: [DemandStatus.IN_PRODUCTION] },
  { key: "ajustes", label: "Ajustes", statuses: [DemandStatus.ADJUSTMENTS] },
  { key: "revisao", label: "Revisão", statuses: [DemandStatus.IN_REVIEW] },
  {
    key: "publicacao",
    label: "Publicação",
    statuses: [DemandStatus.APPROVED, DemandStatus.SCHEDULED],
  },
] as const;

export type DemandFilterKey =
  | "atrasadas"
  | "sem-responsavel"
  | "concluidas-hoje"
  | (typeof FLOW_STAGES)[number]["key"];

type DemandFilter = { label: string; where: Prisma.DemandWhereInput };

function startOfToday(now: Date) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Traduz `?filtro=` do quadro geral num recorte do Prisma.
 * Chave desconhecida devolve null (quadro sem filtro).
 */
export function demandFilter(
  key: string | undefined | null,
  now: Date = new Date()
): DemandFilter | null {
  if (!key) return null;
  switch (key) {
    case "atrasadas":
      return {
        label: "Atrasadas",
        where: { status: { notIn: OPEN_EXCLUDED }, dueDate: { lt: now } },
      };
    case "sem-responsavel":
      return {
        label: "Sem responsável",
        where: {
          assigneeId: null,
          status: { notIn: [DemandStatus.DONE, DemandStatus.CANCELLED] },
        },
      };
    case "concluidas-hoje":
      return {
        label: "Concluídas hoje",
        where: {
          status: { in: [DemandStatus.DONE, DemandStatus.PUBLISHED] },
          updatedAt: { gte: startOfToday(now) },
        },
      };
  }
  const stage = FLOW_STAGES.find((s) => s.key === key);
  if (!stage) return null;
  return { label: stage.label, where: { status: { in: [...stage.statuses] } } };
}

export function demandFilterHref(key: DemandFilterKey) {
  return `/demandas?filtro=${key}`;
}
