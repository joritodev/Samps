import type { DemandStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { PermissionCode } from "@/lib/permissions/codes";
import { canAccessClient, hasPermission } from "@/lib/permissions/resolve";

/** O que a guarda precisa saber de quem age (cabe em `SessionUser`). */
export type GuardActor = {
  id: string;
  permissions: string[];
  clientIds: string[];
  sectorId?: string | null;
};

export type GuardedDemand = {
  id: string;
  clientId: string;
  boardId: string | null;
  status: DemandStatus;
  assigneeId: string | null;
  sectorId: string | null;
};

export type DemandGuardRules = {
  /** Permissão exigida além de enxergar o cliente. */
  permission?: PermissionCode;
  /** Status em que a ação é permitida. */
  statuses?: readonly DemandStatus[];
  statusError?: string;
  /**
   * `assignee`: só o responsável (ou quem pode reatribuir).
   * `sector`: membro do setor da demanda (ou quem pode reatribuir).
   */
  who?: "assignee" | "sector";
};

export const GUARD_NOT_FOUND = "Demanda não encontrada.";
export const GUARD_DENIED = "Sem permissão para esta ação.";
export const GUARD_STATUS = "Esta ação não está disponível para o status atual da demanda.";

/**
 * Regra pura: devolve a mensagem de recusa ou `null` se pode seguir.
 * "Sem acesso ao cliente" responde como "não encontrada" para não revelar
 * que a demanda existe.
 */
export function evaluateDemandAccess(
  actor: GuardActor,
  demand: GuardedDemand,
  rules: DemandGuardRules = {}
): string | null {
  if (!canAccessClient(actor.permissions, actor.clientIds, demand.clientId)) {
    return GUARD_NOT_FOUND;
  }
  if (rules.permission && !hasPermission(actor.permissions, rules.permission)) {
    return GUARD_DENIED;
  }
  if (rules.statuses && !rules.statuses.includes(demand.status)) {
    return rules.statusError ?? GUARD_STATUS;
  }
  if (rules.who) {
    const canReassign = hasPermission(actor.permissions, "demands.assign");
    const allowed =
      rules.who === "assignee"
        ? demand.assigneeId === actor.id
        : Boolean(demand.sectorId) && demand.sectorId === actor.sectorId;
    if (!allowed && !canReassign) return GUARD_DENIED;
  }
  return null;
}

export type DemandGuardResult =
  | { ok: true; demand: GuardedDemand }
  | { ok: false; error: string };

/** Carrega a demanda e aplica `evaluateDemandAccess`. Usar no início de toda ação que recebe um id de demanda. */
export async function guardDemand(
  actor: GuardActor,
  demandId: string,
  rules: DemandGuardRules = {}
): Promise<DemandGuardResult> {
  if (typeof demandId !== "string" || !demandId) return { ok: false, error: GUARD_NOT_FOUND };
  const demand = await db.demand.findUnique({
    where: { id: demandId },
    select: { id: true, clientId: true, boardId: true, status: true, assigneeId: true, sectorId: true },
  });
  if (!demand) return { ok: false, error: GUARD_NOT_FOUND };
  const error = evaluateDemandAccess(actor, demand, rules);
  return error ? { ok: false, error } : { ok: true, demand };
}

/** Mesma ideia para ações que recebem o id de um quadro (competências). */
export async function guardBoard(
  actor: GuardActor,
  boardId: string,
  rules: { permission?: PermissionCode } = {}
): Promise<{ ok: true; clientId: string } | { ok: false; error: string }> {
  const board = await db.clientBoard.findUnique({
    where: { id: boardId },
    select: { clientId: true },
  });
  if (!board || !canAccessClient(actor.permissions, actor.clientIds, board.clientId)) {
    return { ok: false, error: "Quadro não encontrado." };
  }
  if (rules.permission && !hasPermission(actor.permissions, rules.permission)) {
    return { ok: false, error: GUARD_DENIED };
  }
  return { ok: true, clientId: board.clientId };
}
