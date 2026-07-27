import type { AuditAction } from "@prisma/client";

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  USER_CREATED: "Usuário criado",
  USER_UPDATED: "Usuário atualizado",
  USER_DEACTIVATED: "Usuário desativado",
  CLIENT_CREATED: "Cliente criado",
  CLIENT_UPDATED: "Cliente atualizado",
  BOARD_CREATED: "Quadro criado",
  PORTAL_CREATED: "Portal criado",
  CARD_AUTO_CREATED: "Cartão gerado automaticamente",
  BRIEFING_DEMANDED: "Briefing concluído e demandado",
  BRIEFING_LOCKED: "Briefing travado",
  PRODUCTION_COMPLETED: "Produção concluída",
  PUBLICATION_REGISTERED: "Publicação registrada",
  DEMAND_CREATED: "Demanda criada",
  DEMAND_UPDATED: "Demanda atualizada",
  RESPONSIBLE_CHANGED: "Responsável alterado",
  DEADLINE_CHANGED: "Prazo alterado",
  STATUS_CHANGED: "Status alterado",
  COMMENT_ADDED: "Comentário adicionado",
  LINK_ADDED: "Link adicionado",
  INFO_RELEASED: "Informação liberada ao cliente",
  ACCESS_REVOKED: "Acesso revogado",
  PROJECT_UPDATED: "Projeto atualizado",
  SHOOT_CREATED: "Captação criada",
  BOARD_ARCHIVED: "Quadro arquivado",
  DEMAND_CLAIMED: "Demanda assumida",
  DEMAND_ASSIGNED_SECTOR: "Demanda atribuída ao setor",
  WORK_SESSION_STARTED: "Cronômetro iniciado",
  WORK_SESSION_PAUSED: "Cronômetro pausado",
  WORK_SESSION_RESUMED: "Cronômetro retomado",
  WORK_SESSION_COMPLETED: "Cronômetro finalizado",
  PRIORITY_RECALCULATED: "Prioridades recalculadas",
  LOGIN: "Login",
  LOGIN_FAILED: "Falha de login",
  OTHER: "Outro",
};

export const ENTITY_TYPE_LABEL: Record<string, string> = {
  User: "Usuário",
  Client: "Cliente",
  Demand: "Demanda",
  Project: "Projeto",
  Shoot: "Captação",
  ClientBoard: "Quadro",
  ClientPortal: "Portal",
};

export function auditActionLabel(action: AuditAction) {
  return AUDIT_ACTION_LABEL[action] ?? action;
}

export function entityTypeLabel(entityType: string | null) {
  if (!entityType) return "—";
  return ENTITY_TYPE_LABEL[entityType] ?? entityType;
}
