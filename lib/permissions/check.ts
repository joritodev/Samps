import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  canAccessClient,
  hasPermission,
  resolveUserClientIds,
  resolveUserPermissions,
} from "./resolve";
import type { PermissionCode } from "./codes";

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePermission(code: PermissionCode) {
  const user = await requireAuth();
  if (!hasPermission(user.permissions, code)) {
    redirect("/dashboard");
  }
  return user;
}

export async function requireClientAccess(clientId: string) {
  const user = await requireAuth();
  if (!canAccessClient(user.permissions, user.clientIds, clientId)) {
    redirect("/dashboard");
  }
  return user;
}

export async function refreshUserPermissions(userId: string) {
  const [permissions, clientIds] = await Promise.all([
    resolveUserPermissions(userId),
    resolveUserClientIds(userId),
  ]);
  return { permissions, clientIds };
}
