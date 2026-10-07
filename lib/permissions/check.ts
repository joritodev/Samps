import { cache } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
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

/**
 * Sessão do request. O JWT vale 7 dias, então o status da conta é relido do
 * banco: quem foi desativado ou bloqueado perde o acesso na hora, não só no
 * próximo login. `revoked` separa "nunca entrou" de "entrou e perdeu a conta".
 */
async function loadSession() {
  const session = await auth();
  if (!session?.user?.id) return { user: null, revoked: false };

  const { permissions, clientIds, active } = await freshScope(session.user.id);
  if (!active) return { user: null, revoked: true };
  return { user: { ...session.user, permissions, clientIds }, revoked: false };
}

export async function getSessionUser() {
  return (await loadSession()).user;
}

export async function requireAuth() {
  const { user, revoked } = await loadSession();
  // `/sair` encerra o cookie; mandar direto a `/login` entraria em laço (logado → home → login).
  if (!user) redirect(revoked ? "/sair" : "/login");
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
  const [permissions, clientIds, account] = await Promise.all([
    resolveUserPermissions(userId),
    resolveUserClientIds(userId),
    db.user.findUnique({ where: { id: userId }, select: { status: true } }),
  ]);
  return { permissions, clientIds, active: account?.status === "ACTIVE" };
}
