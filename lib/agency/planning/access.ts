import { UserType } from "@prisma/client";
import { hasPermission } from "@/lib/permissions/resolve";
import type { PermissionCode } from "@/lib/permissions/codes";

/** Mensagem única para quem tenta algo sem permissão (nada de detalhe interno). */
export const PLANNING_FORBIDDEN = "Você não tem permissão para esta ação no planejamento.";

export type PlanningAccess = { canView: boolean; canEdit: boolean; canManage: boolean };

type AccessUser = { userType: UserType; permissions: string[] };

/** Cliente externo nunca acessa o planejamento, mesmo que um papel o conceda por engano. */
export function planningAccess(user: AccessUser): PlanningAccess {
  if (user.userType === UserType.EXTERNAL_CLIENT) {
    return { canView: false, canEdit: false, canManage: false };
  }
  const has = (code: PermissionCode) => hasPermission(user.permissions, code);
  const canManage = has("planning.manage");
  const canEdit = canManage || has("planning.edit");
  const canView = canEdit || has("planning.view");
  return { canView, canEdit, canManage };
}

/** Lança se o usuário não tiver o nível pedido. Usada por serviços e actions. */
export function assertPlanning(user: AccessUser, level: "view" | "edit" | "manage") {
  const access = planningAccess(user);
  const ok =
    level === "view" ? access.canView : level === "edit" ? access.canEdit : access.canManage;
  if (!ok) throw new Error(PLANNING_FORBIDDEN);
  return access;
}
