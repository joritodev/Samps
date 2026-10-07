import {
  DemandStatus,
  UserType,
  type DemandOrigin,
  type DemandType,
  type ProjectStatus,
  type ShootStatus,
} from "@prisma/client";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNING: "Planejamento",
  ACTIVE: "Em andamento",
  ON_HOLD: "Pausado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

export const SHOOT_STATUS_LABEL: Record<ShootStatus, string> = {
  PLANNED: "Planejada",
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  IN_PROGRESS: "Em execução",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

export const USER_TYPE_LABEL: Record<UserType, string> = {
  ADMIN: "Administrador",
  MANAGEMENT: "Gestão",
  SOCIAL_MEDIA: "Social Media",
  DESIGNER: "Designer",
  VIDEOMAKER: "Videomaker",
  VIDEO_EDITOR: "Editor de vídeo",
  OTHER: "Outro",
  EXTERNAL_CLIENT: "Cliente externo",
};

export const DEMAND_STATUS_LABEL: Record<DemandStatus, string> = {
  BACKLOG: "Backlog",
  PENDING_PLANNING: "A planejar",
  PLANNING: "Em planejamento",
  OPEN: "Pendente",
  AVAILABLE: "Disponível",
  DEMANDED: "Demandada",
  IN_PRODUCTION: "Em produção",
  IN_REVIEW: "Em revisão",
  ADJUSTMENTS: "Em ajuste",
  APPROVED: "Aprovado",
  SCHEDULED: "Agendada",
  PUBLISHED: "Publicada",
  DELIVERED: "Entregue",
  DONE: "Concluída",
  OVERDUE: "Atrasada",
  CANCELLED: "Cancelada",
};

export function demandStatusLabel(status: string) {
  return DEMAND_STATUS_LABEL[status as DemandStatus] ?? status;
}

export const DEMAND_TYPE_LABEL: Record<DemandType, string> = {
  FEED: "Feed",
  STORY: "Story",
  REEL: "Reel",
  VIDEO: "Vídeo",
  DESIGN: "Design",
  COPY: "Copy",
  FOLLOW_UP: "Follow-up",
  EXTRA: "Extra",
  PROJECT_TASK: "Tarefa de projeto",
  OTHER: "Outro",
};

export function demandTypeLabel(type: string) {
  return DEMAND_TYPE_LABEL[type as DemandType] ?? type;
}

export const DEMAND_ORIGIN_LABEL: Record<DemandOrigin, string> = {
  CLIENT_BOARD: "Quadro do cliente",
  SOCIAL_PANEL: "Social",
  DESIGN_BOARD: "Design",
  VIDEO_BOARD: "Vídeo",
  MANAGEMENT: "Gestão",
  PROJECT: "Projeto",
  EXTRA: "Extra",
};

export function demandOriginLabel(origin: string) {
  return DEMAND_ORIGIN_LABEL[origin as DemandOrigin] ?? origin;
}

/** Status em que o briefing ainda pode ser concluído e demandado. */
export const BRIEFING_DEMAND_STATUSES: DemandStatus[] = [
  DemandStatus.PENDING_PLANNING,
  DemandStatus.PLANNING,
  DemandStatus.OPEN,
  DemandStatus.BACKLOG,
];

export function canDemandBriefing(
  status: string,
  briefingLockedAt?: Date | string | null
) {
  if (briefingLockedAt) return false;
  return BRIEFING_DEMAND_STATUSES.includes(status as DemandStatus);
}

export function canCompleteProduction(status: string) {
  return (
    status === DemandStatus.IN_PRODUCTION ||
    status === DemandStatus.ADJUSTMENTS
  );
}

export function canRequestAdjustment(status: string) {
  return status === DemandStatus.IN_REVIEW;
}

/** Não volta para atribuir nem para iniciar produção. */
export function isDemandClosedForProduction(status: string) {
  return (
    status === DemandStatus.IN_REVIEW ||
    status === DemandStatus.APPROVED ||
    status === DemandStatus.SCHEDULED ||
    status === DemandStatus.PUBLISHED ||
    status === DemandStatus.DONE ||
    status === DemandStatus.DELIVERED ||
    status === DemandStatus.CANCELLED
  );
}

export function canRegisterPublication(status: string) {
  return (
    status === DemandStatus.APPROVED ||
    status === DemandStatus.SCHEDULED
  );
}

/** Quem pode aprovar / pedir ajuste / publicar na revisão social. */
export function canReviewDemand(userType: UserType | string) {
  return (
    userType === UserType.SOCIAL_MEDIA ||
    userType === UserType.MANAGEMENT ||
    userType === UserType.ADMIN
  );
}

export const DEMAND_ACTION_DENIED = {
  production:
    "Só é possível concluir produção em demandas em produção ou ajuste.",
  adjustment: "Só é possível solicitar ajuste em demandas em revisão.",
  publication:
    "Só é possível registrar publicação em demandas aprovadas ou agendadas.",
  review: "Sem permissão para revisar esta demanda.",
  closed:
    "Demanda aprovada, publicada ou encerrada não volta para produção.",
} as const;

export function assertDemandOpenForProduction(status: string) {
  if (isDemandClosedForProduction(status)) {
    throw new Error(DEMAND_ACTION_DENIED.closed);
  }
}

export function assertCanCompleteProduction(status: string) {
  if (!canCompleteProduction(status)) {
    throw new Error(DEMAND_ACTION_DENIED.production);
  }
}

/**
 * Quem executa a demanda conclui a produção mesmo sem carteira do cliente.
 * Quem não executa e não vê o cliente recebe "não encontrada", para não
 * revelar a demanda. Quem vê o cliente, mas não executa, recebe a negativa real.
 */
export function productionCompletionBlock(input: {
  isExecutor: boolean;
  canSeeClient: boolean;
}): "ok" | "hidden" | "not-executor" {
  if (input.isExecutor) return "ok";
  if (!input.canSeeClient) return "hidden";
  return "not-executor";
}

export function assertCanRequestAdjustment(status: string) {
  if (!canRequestAdjustment(status)) {
    throw new Error(DEMAND_ACTION_DENIED.adjustment);
  }
}

export function assertCanRegisterPublication(status: string) {
  if (!canRegisterPublication(status)) {
    throw new Error(DEMAND_ACTION_DENIED.publication);
  }
}

