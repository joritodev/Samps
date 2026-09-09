import { cache } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  canAccessClient,
  hasAnyPermission,
  hasPermission,
  resolveUserClientIds,
  resolveUserPermissions,
} from "./resolve";
import type { PermissionCode } from "./codes";
import { getDashboardPath } from "@/types/auth";

/**
 * O JWT carrega as permissões do momento do login. Como funções e vínculos são
 * editáveis em runtime, o servidor relê ambos a cada request — `cache` garante
 * uma única consulta por render, mesmo com layout e página chamando `requireAuth`.
 */
const freshScope = cache(refreshUserPermissions);

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { permissions, clientIds } = await freshScope(session.user.id);
  return { ...session.user, permissions, clientIds };
}

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePermission(code: PermissionCode) {
  const user = await requireAuth();
  if (!hasPermission(user.permissions, code)) {
    redirect(getDashboardPath(user.userType));
  }
  return user;
}

export async function requireAnyPermission(...codes: PermissionCode[]) {
  const user = await requireAuth();
  if (!hasAnyPermission(user.permissions, codes)) {
    redirect(getDashboardPath(user.userType));
  }
  return user;
}

export async function requireClientAccess(clientId: string) {
  const user = await requireAuth();
  if (!canAccessClient(user.permissions, user.clientIds, clientId)) {
    redirect(getDashboardPath(user.userType));
  }
  return user;
}

/**
 * Restringe uma consulta aos clientes que o usuário pode ver.
 * Retorna `undefined` quando ele enxerga todos (nenhum filtro necessário).
 */
export function clientScopeFilter(user: {
  permissions: string[];
  clientIds: string[];
}): { in: string[] } | undefined {
  if (hasPermission(user.permissions, "clients.view_all")) return undefined;
  return { in: user.clientIds };
}

export async function refreshUserPermissions(userId: string) {
  const [permissions, clientIds] = await Promise.all([
    resolveUserPermissions(userId),
    resolveUserClientIds(userId),
  ]);
  return { permissions, clientIds };
}
