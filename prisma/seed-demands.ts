import {
  DemandOrigin,
  DemandStatus,
  DemandType,
  type BoardListType,
} from "@prisma/client";
import {
  assignmentStatusForDemandStatus,
  boardColumnForDemandStatus,
  demandCycleViolations,
  internalStatusForDemandStatus,
  type DemandCycleSnapshot,
} from "../lib/agency/demand-cycle";

export type SeedPriorityName = "Baixa" | "Média" | "Alta" | "Urgente";

export type SeedDemand = {
  title: string;
  description?: string;
  type: DemandType;
  origin: DemandOrigin;
  status: DemandStatus;
  priorityName: SeedPriorityName;
  contentTypeSlug?: string | null;
  format?: string | null;
  clientKey: "bella" | "sorriso";
  requesterKey: "social" | "gestor";
  assigneeKey?: "designer" | "videomaker" | "editor" | "trafego" | "gestor" | null;
  sectorKey?: "design" | "video" | "trafego" | null;
  materialUrl?: string | null;
  publishedUrl?: string | null;
  visibleToClient?: boolean;
  durationSeconds?: number | null;
  orientation?: string | null;
  createdAtOffsetDays: number;
  dueDateOffsetDays: number | null;
  productionStartedOffsetDays?: number | null;
  productionCompletedOffsetDays?: number | null;
  publishedOffsetDays?: number | null;
  deliveryOffsetDays?: number | null;
  publishDateOffsetDays?: number | null;
};

export const SEED_DEMANDS: SeedDemand[] = [
  {
    title: "Reel depoimento paciente — briefing",
    description:
      "Social ainda fecha o briefing com a Bella: paciente autoriza depoimento, tom acolhedor, CTA agendar avaliação.",
    type: DemandType.REEL,
    origin: DemandOrigin.SOCIAL_PANEL,
    status: DemandStatus.PENDING_PLANNING,
    priorityName: "Alta",
    contentTypeSlug: "reels-demo",
    format: "reel",
    clientKey: "bella",
    requesterKey: "social",
    sectorKey: null,
    durationSeconds: 30,
    orientation: "9:16",
    createdAtOffsetDays: -1,
    dueDateOffsetDays: 10,
  },
  {
    title: "Carrossel mitos e verdades — planejamento",
    description:
      "Rascunho da gestão: 5 cards sobre clareamento. Título e formato ainda podem mudar antes de demandar o design.",
    type: DemandType.FEED,
    origin: DemandOrigin.MANAGEMENT,
    status: DemandStatus.PLANNING,
    priorityName: "Média",
    contentTypeSlug: "carrossel",
    format: "carrossel",
    clientKey: "sorriso",
    requesterKey: "gestor",
    assigneeKey: "gestor",
    sectorKey: null,
    createdAtOffsetDays: -2,
    dueDateOffsetDays: 12,
  },
  {
    title: "Campanha avaliação gratuita — briefing tráfego",
    description:
      "Gestão e social alinhando objetivo, público e oferta antes de enviar ao setor de tráfego.",
    type: DemandType.OTHER,
    origin: DemandOrigin.MANAGEMENT,
    status: DemandStatus.PENDING_PLANNING,
    priorityName: "Alta",
    contentTypeSlug: "estatico",
    format: "campanha",
    clientKey: "bella",
    requesterKey: "gestor",
    sectorKey: null,
    createdAtOffsetDays: 0,
    dueDateOffsetDays: 8,
  },
  {
    title: "Stories bastidores da clínica — rascunho",
    description: "Pauta aberta: enquete + making of. Ainda sem tipo de vídeo fechado.",
    type: DemandType.STORY,
    origin: DemandOrigin.SOCIAL_PANEL,
    status: DemandStatus.PENDING_PLANNING,
    priorityName: "Baixa",
    contentTypeSlug: "stories-video-demo",
    format: "stories",
    clientKey: "sorriso",
    requesterKey: "social",
    sectorKey: null,
    durationSeconds: 15,
    orientation: "9:16",
    createdAtOffsetDays: -1,
    dueDateOffsetDays: 14,
  },
  {
    title: "Carrossel benefícios da harmonização",
    description:
      "Briefing concluído. Disponível no Design para o primeiro executor pegar. 5 slides, tom educativo.",
    type: DemandType.FEED,
    origin: DemandOrigin.SOCIAL_PANEL,
    status: DemandStatus.DEMANDED,
    priorityName: "Alta",
    contentTypeSlug: "carrossel",
    format: "carrossel",
    clientKey: "bella",
    requesterKey: "social",
    sectorKey: "design",
    createdAtOffsetDays: -3,
    dueDateOffsetDays: 5,
  },
  {
    title: "Post estático — promoção clareamento",
    description: "Peça única para feed. Copy e oferta já no briefing. Sem executor.",
    type: DemandType.FEED,
    origin: DemandOrigin.SOCIAL_PANEL,
    status: DemandStatus.DEMANDED,
    priorityName: "Média",
    contentTypeSlug: "estatico",
    format: "estático",
    clientKey: "sorriso",
    requesterKey: "social",
    sectorKey: "design",
    createdAtOffsetDays: -4,
    dueDateOffsetDays: 4,
  },
  {
    title: "Thumbnails YouTube — série procedimentos",
    description: "3 thumbnails 1280×720. Disponível no Design.",
    type: DemandType.DESIGN,
    origin: DemandOrigin.MANAGEMENT,
    status: DemandStatus.DEMANDED,
    priorityName: "Baixa",
    contentTypeSlug: "estatico",
    format: "thumbnail",
    clientKey: "bella",
    requesterKey: "gestor",
    sectorKey: "design",
    createdAtOffsetDays: -5,
    dueDateOffsetDays: 9,
  },
  {
    title: "Campanha Meta Ads — avaliação",
    description:
      "Tráfego: conjunto de anúncios para captação. Briefing fechado, sem executor ainda.",
    type: DemandType.OTHER,
    origin: DemandOrigin.MANAGEMENT,
    status: DemandStatus.DEMANDED,
    priorityName: "Alta",
    contentTypeSlug: "estatico",
    format: "tráfego",
    clientKey: "bella",
    requesterKey: "gestor",
    sectorKey: "trafego",
    createdAtOffsetDays: -2,
    dueDateOffsetDays: 6,
  },
  {
    title: "Reel tutorial higiene bucal",
    description:
      "Vídeo demonstração 30s, 9:16. Disponível no setor de vídeo para o editor pegar.",
    type: DemandType.REEL,
    origin: DemandOrigin.SOCIAL_PANEL,
    status: DemandStatus.DEMANDED,
    priorityName: "Média",
    contentTypeSlug: "reels-demo",
    format: "reel",
    clientKey: "sorriso",
    requesterKey: "social",
    sectorKey: "video",
    durationSeconds: 30,
    orientation: "9:16",
    createdAtOffsetDays: -3,
    dueDateOffsetDays: 7,
  },
  {
    title: "Carrossel institucional Bella — atribuído",
    description:
      "João assumiu o cartão no Design e ainda não iniciou a produção.",
    type: DemandType.FEED,
    origin: DemandOrigin.SOCIAL_PANEL,
    status: DemandStatus.DEMANDED,
    priorityName: "Alta",
    contentTypeSlug: "carrossel",
    format: "carrossel",
    clientKey: "bella",
    requesterKey: "social",
    assigneeKey: "designer",
    sectorKey: "design",
    createdAtOffsetDays: -2,
    dueDateOffsetDays: 3,
  },
  {
    title: "Banner site — harmonização facial",
    description: "João está produzindo o banner 1920×600 no Design.",
    type: DemandType.DESIGN,
    origin: DemandOrigin.SOCIAL_PANEL,
    status: DemandStatus.IN_PRODUCTION,
    priorityName: "Média",
    contentTypeSlug: "estatico",
    format: "estático",
    clientKey: "bella",
    requesterKey: "social",
    assigneeKey: "designer",
    sectorKey: "design",
    createdAtOffsetDays: -4,
    dueDateOffsetDays: -1,
    productionStartedOffsetDays: -1,
  },
  {
    title: "Reel depoimento paciente — edição",
    description:
      "Luiza editando o depoimento. 45s, 9:16. Setor de vídeo, cliente Sorriso (editor vinculado).",
    type: DemandType.REEL,
    origin: DemandOrigin.VIDEO_BOARD,
    status: DemandStatus.IN_PRODUCTION,
    priorityName: "Alta",
    contentTypeSlug: "reels-demo",
    format: "reel",
    clientKey: "sorriso",
    requesterKey: "social",
    assigneeKey: "editor",
    sectorKey: "video",
    durationSeconds: 45,
    orientation: "9:16",
    createdAtOffsetDays: -5,
    dueDateOffsetDays: 2,
    productionStartedOffsetDays: -2,
  },
  {
    title: "Teste A/B criativos clareamento",
    description: "Rafael montando variações de anúncio no Meta Ads.",
    type: DemandType.OTHER,
    origin: DemandOrigin.MANAGEMENT,
    status: DemandStatus.IN_PRODUCTION,
    priorityName: "Alta",
    contentTypeSlug: "estatico",
    format: "anúncio",
    clientKey: "sorriso",
    requesterKey: "gestor",
    assigneeKey: "trafego",
    sectorKey: "trafego",
    createdAtOffsetDays: -3,
    dueDateOffsetDays: 4,
    productionStartedOffsetDays: -1,
  },
  {
    title: "Stories vídeo — rotina da clínica",
    description: "Pedro (videomaker) produzindo stories 15s para a Bella.",
    type: DemandType.STORY,
    origin: DemandOrigin.SOCIAL_PANEL,
    status: DemandStatus.IN_PRODUCTION,
    priorityName: "Média",
    contentTypeSlug: "stories-video-demo",
    format: "stories",
    clientKey: "bella",
    requesterKey: "social",
    assigneeKey: "videomaker",
    sectorKey: "video",
    durationSeconds: 15,
    orientation: "9:16",
    createdAtOffsetDays: -3,
    dueDateOffsetDays: 3,
    productionStartedOffsetDays: -1,
  },
  {
    title: "Post estático limpeza de pele",
    description:
      "Social pediu ajuste: contraste do CTA e logo maior. Designer devolve na coluna de ajustes.",
    type: DemandType.FEED,
    origin: DemandOrigin.SOCIAL_PANEL,
    status: DemandStatus.ADJUSTMENTS,
    priorityName: "Média",
    contentTypeSlug: "estatico",
    format: "estático",
    clientKey: "bella",
    requesterKey: "social",
    assigneeKey: "designer",
    sectorKey: "design",
    materialUrl: "https://drive.google.com/file/d/seed-estatico-limpeza/view",
    createdAtOffsetDays: -6,
    dueDateOffsetDays: 2,
    productionStartedOffsetDays: -3,
    productionCompletedOffsetDays: -1,
  },
  {
    title: "Vídeo making of da clínica",
    description:
      "Ajuste: cortar intro em 2s e legendas mais contrastadas. Editor no setor de vídeo.",
    type: DemandType.REEL,
    origin: DemandOrigin.SOCIAL_PANEL,
    status: DemandStatus.ADJUSTMENTS,
    priorityName: "Alta",
    contentTypeSlug: "reels-demo",
    format: "reel",
    clientKey: "sorriso",
    requesterKey: "social",
    assigneeKey: "editor",
    sectorKey: "video",
    durationSeconds: 30,
    orientation: "9:16",
    materialUrl: "https://drive.google.com/file/d/seed-making-of/view",
    createdAtOffsetDays: -6,
    dueDateOffsetDays: 1,
    productionStartedOffsetDays: -4,
    productionCompletedOffsetDays: -1,
  },
  {
    title: "Carrossel cultura da clínica",
    description:
      "João entregou o carrossel. Aguardando revisão da social. Assignee continua o executor.",
    type: DemandType.FEED,
    origin: DemandOrigin.SOCIAL_PANEL,
    status: DemandStatus.IN_REVIEW,
    priorityName: "Média",
    contentTypeSlug: "carrossel",
    format: "carrossel",
    clientKey: "bella",
    requesterKey: "social",
    assigneeKey: "designer",
    sectorKey: "design",
    materialUrl: "https://drive.google.com/file/d/seed-carrossel-cultura/view",
    createdAtOffsetDays: -7,
    dueDateOffsetDays: 1,
    productionStartedOffsetDays: -4,
    productionCompletedOffsetDays: -1,
  },
  {
    title: "Reel bastidores da clínica",
    description:
      "Pedro entregou o reel. Revisão com a social — assignee é o videomaker, não o revisor.",
    type: DemandType.REEL,
    origin: DemandOrigin.VIDEO_BOARD,
    status: DemandStatus.IN_REVIEW,
    priorityName: "Alta",
    contentTypeSlug: "reels-demo",
    format: "reel",
    clientKey: "bella",
    requesterKey: "social",
    assigneeKey: "videomaker",
    sectorKey: "video",
    durationSeconds: 30,
    orientation: "9:16",
    materialUrl: "https://drive.google.com/file/d/seed-reel-bastidores/view",
    createdAtOffsetDays: -5,
    dueDateOffsetDays: 1,
    productionStartedOffsetDays: -3,
    productionCompletedOffsetDays: -1,
  },
  {
    title: "Feed — resultado harmonização",
    description: "Aprovado pela social. Aguardando publicação. Visível no portal da Bella.",
    type: DemandType.FEED,
    origin: DemandOrigin.SOCIAL_PANEL,
    status: DemandStatus.APPROVED,
    priorityName: "Média",
    contentTypeSlug: "estatico",
    format: "estático",
    clientKey: "bella",
    requesterKey: "social",
    assigneeKey: "designer",
    sectorKey: "design",
    materialUrl: "https://drive.google.com/file/d/seed-feed-harmonizacao/view",
    visibleToClient: true,
    createdAtOffsetDays: -6,
    dueDateOffsetDays: 0,
    productionStartedOffsetDays: -4,
    productionCompletedOffsetDays: -2,
    deliveryOffsetDays: 0,
    publishDateOffsetDays: 2,
  },
  {
    title: "Carrossel cuidados pós-clareamento",
    description: "Aprovado. Fila de publicação da Sorriso.",
    type: DemandType.FEED,
    origin: DemandOrigin.SOCIAL_PANEL,
    status: DemandStatus.APPROVED,
    priorityName: "Média",
    contentTypeSlug: "carrossel",
    format: "carrossel",
    clientKey: "sorriso",
    requesterKey: "social",
    assigneeKey: "designer",
    sectorKey: "design",
    materialUrl: "https://drive.google.com/file/d/seed-carrossel-pos/view",
    visibleToClient: true,
    createdAtOffsetDays: -5,
    dueDateOffsetDays: 0,
    productionStartedOffsetDays: -3,
    productionCompletedOffsetDays: -2,
  },
  {
    title: "Stories promoção harmonização",
    description: "Aprovado e agendado para publicação. Stories estático.",
    type: DemandType.STORY,
    origin: DemandOrigin.SOCIAL_PANEL,
    status: DemandStatus.SCHEDULED,
    priorityName: "Alta",
    contentTypeSlug: "stories",
    format: "stories",
    clientKey: "bella",
    requesterKey: "social",
    assigneeKey: "designer",
    sectorKey: "design",
    materialUrl: "https://drive.google.com/file/d/seed-stories-promo/view",
    visibleToClient: true,
    createdAtOffsetDays: -4,
    dueDateOffsetDays: 1,
    productionStartedOffsetDays: -3,
    productionCompletedOffsetDays: -2,
    publishDateOffsetDays: 1,
  },
  {
    title: "Reels — rotina de skincare",
    description: "Publicado no Instagram. URL e anexo visíveis no portal.",
    type: DemandType.REEL,
    origin: DemandOrigin.SOCIAL_PANEL,
    status: DemandStatus.PUBLISHED,
    priorityName: "Média",
    contentTypeSlug: "reels",
    format: "reel",
    clientKey: "bella",
    requesterKey: "social",
    assigneeKey: "videomaker",
    sectorKey: "video",
    durationSeconds: 20,
    orientation: "9:16",
    materialUrl: "https://drive.google.com/file/d/seed-reels-skincare/view",
    publishedUrl: "https://www.instagram.com/p/seed-reels-skincare/",
    visibleToClient: true,
    createdAtOffsetDays: -12,
    dueDateOffsetDays: -3,
    productionStartedOffsetDays: -10,
    productionCompletedOffsetDays: -6,
    publishedOffsetDays: -3,
    deliveryOffsetDays: -4,
    publishDateOffsetDays: -3,
  },
  {
    title: "Feed — equipe da clínica",
    description: "Post publicado. Material no Drive da Bella.",
    type: DemandType.FEED,
    origin: DemandOrigin.SOCIAL_PANEL,
    status: DemandStatus.PUBLISHED,
    priorityName: "Baixa",
    contentTypeSlug: "estatico",
    format: "estático",
    clientKey: "bella",
    requesterKey: "social",
    assigneeKey: "designer",
    sectorKey: "design",
    materialUrl: "https://drive.google.com/file/d/seed-feed-equipe/view",
    publishedUrl: "https://www.instagram.com/p/seed-feed-equipe/",
    visibleToClient: true,
    createdAtOffsetDays: -10,
    dueDateOffsetDays: -5,
    productionStartedOffsetDays: -8,
    productionCompletedOffsetDays: -7,
    publishedOffsetDays: -6,
    deliveryOffsetDays: -7,
    publishDateOffsetDays: -6,
  },
  {
    title: "Carrossel FAQ clareamento",
    description: "Publicado. Visível no portal da Sorriso.",
    type: DemandType.FEED,
    origin: DemandOrigin.SOCIAL_PANEL,
    status: DemandStatus.PUBLISHED,
    priorityName: "Média",
    contentTypeSlug: "carrossel",
    format: "carrossel",
    clientKey: "sorriso",
    requesterKey: "social",
    assigneeKey: "designer",
    sectorKey: "design",
    materialUrl: "https://drive.google.com/file/d/seed-faq-clareamento/view",
    publishedUrl: "https://www.instagram.com/p/seed-faq-clareamento/",
    visibleToClient: true,
    createdAtOffsetDays: -14,
    dueDateOffsetDays: -4,
    productionStartedOffsetDays: -12,
    productionCompletedOffsetDays: -8,
    publishedOffsetDays: -4,
    deliveryOffsetDays: -5,
    publishDateOffsetDays: -4,
  },
  {
    title: "Stories dica do dentista",
    description: "Stories publicado com link permanente.",
    type: DemandType.STORY,
    origin: DemandOrigin.SOCIAL_PANEL,
    status: DemandStatus.PUBLISHED,
    priorityName: "Baixa",
    contentTypeSlug: "stories",
    format: "stories",
    clientKey: "sorriso",
    requesterKey: "social",
    assigneeKey: "designer",
    sectorKey: "design",
    materialUrl: "https://drive.google.com/file/d/seed-stories-dica/view",
    publishedUrl: "https://www.instagram.com/stories/highlights/seed-dica/",
    visibleToClient: true,
    createdAtOffsetDays: -8,
    dueDateOffsetDays: -2,
    productionStartedOffsetDays: -6,
    productionCompletedOffsetDays: -4,
    publishedOffsetDays: -2,
    deliveryOffsetDays: -3,
    publishDateOffsetDays: -2,
  },
];

const WORK_SESSION_SECONDS: Record<string, number> = {
  "Post estático limpeza de pele": 4200,
  "Vídeo making of da clínica": 5400,
  "Carrossel cultura da clínica": 10080,
  "Reel bastidores da clínica": 12600,
  "Feed — resultado harmonização": 4800,
  "Carrossel cuidados pós-clareamento": 7560,
  "Stories promoção harmonização": 1680,
  "Reels — rotina de skincare": 9600,
  "Feed — equipe da clínica": 3300,
  "Carrossel FAQ clareamento": 7920,
  "Stories dica do dentista": 1500,
};

export function workSessionSecondsForTitle(title: string): number | undefined {
  return WORK_SESSION_SECONDS[title];
}

export function listIdForDemandType(
  type: DemandType,
  lists: { id: string; type: BoardListType }[]
): string | null {
  const byType = Object.fromEntries(lists.map((list) => [list.type, list.id])) as Partial<
    Record<BoardListType, string>
  >;
  if (type === DemandType.STORY) {
    return byType.STORIES ?? lists[0]?.id ?? null;
  }
  if (type === DemandType.VIDEO) {
    return byType.FOLLOW_UP ?? lists[0]?.id ?? null;
  }
  return byType.FEEDS ?? lists[0]?.id ?? null;
}

export function seedDemandCycleSnapshot(
  demand: SeedDemand,
  assigneeId: string | null
): DemandCycleSnapshot {
  const hint = { assigneeId };
  return {
    status: demand.status,
    boardColumn: boardColumnForDemandStatus(demand.status, hint),
    title: demand.title,
    briefingLockedAt: stillInBriefing(demand.status) ? null : new Date(),
    description: demand.description,
    format: demand.format,
    orientation: demand.orientation,
    durationSeconds: demand.durationSeconds,
    demandType: demand.type,
    contentTypeSlug: demand.contentTypeSlug,
    sectorId: demand.sectorKey,
    assigneeId,
    materialUrl: demand.materialUrl,
    publishedUrl: demand.publishedUrl,
    visibleToClient: demand.visibleToClient,
  };
}

export function stillInBriefing(status: DemandStatus): boolean {
  return (
    status === DemandStatus.PENDING_PLANNING ||
    status === DemandStatus.PLANNING ||
    status === DemandStatus.OPEN ||
    status === DemandStatus.BACKLOG
  );
}

export function assertSeedDemandsFollowCycle(demands: SeedDemand[] = SEED_DEMANDS) {
  const errors: string[] = [];
  for (const demand of demands) {
    const assigneeId = demand.assigneeKey ?? null;
    const gaps = demandCycleViolations(
      seedDemandCycleSnapshot(demand, assigneeId)
    );
    if (gaps.length) {
      errors.push(`${demand.title}: ${gaps.join("; ")}`);
    }
  }
  if (errors.length) {
    throw new Error(`Seed de demandas fora do ciclo vivo:\n- ${errors.join("\n- ")}`);
  }
}

export function operationalFieldsForSeedDemand(
  demand: SeedDemand,
  assigneeId: string | null
) {
  const hint = { assigneeId };
  return {
    boardColumn: boardColumnForDemandStatus(demand.status, hint),
    internalStatus: internalStatusForDemandStatus(demand.status, hint),
    assignmentStatus: assignmentStatusForDemandStatus(demand.status, hint),
  };
}
