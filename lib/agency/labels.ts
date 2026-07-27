import type {
  DemandStatus,
  ProjectStatus,
  ShootStatus,
  UserType,
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
