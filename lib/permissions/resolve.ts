import { db } from "@/lib/db";
import type { PermissionCode } from "./codes";

export async function resolveUserPermissions(userId: string): Promise<string[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
      permissionOverrides: { include: { permission: true } },
    },
  });

  if (!user) return [];

  const rolePerms = new Set(
    user.role.permissions.map((rp) => rp.permission.code)
  );

  for (const override of user.permissionOverrides) {
    if (override.granted) {
      rolePerms.add(override.permission.code);
    } else {
      rolePerms.delete(override.permission.code);
    }
  }

  return Array.from(rolePerms);
}

export async function resolveUserClientIds(userId: string): Promise<string[]> {
  const links = await db.userClientLink.findMany({
    where: { userId, isActive: true },
    select: { clientId: true },
  });
  return links.map((l) => l.clientId);
}

export function hasPermission(
  permissions: string[],
  code: PermissionCode | string
): boolean {
  return permissions.includes(code);
}

export function hasAnyPermission(
  permissions: string[],
  codes: readonly (PermissionCode | string)[]
): boolean {
  return codes.some((code) => hasPermission(permissions, code));
}

/** Painel da gestão — só Admin e Gestão, não quem herdou `indicators.view`. */
export function canSeeManagementDashboard(userType: string): boolean {
  return userType === "ADMIN" || userType === "MANAGEMENT";
}

export function canSeeTeamDirectory(permissions: string[]): boolean {
  return hasAnyPermission(permissions, ["users.edit", "users.create"]);
}

export function canAccessClient(
  permissions: string[],
  clientIds: string[],
  clientId: string
): boolean {
  if (hasPermission(permissions, "clients.view_all")) return true;
  if (
    hasPermission(permissions, "clients.view_assigned") ||
    hasPermission(permissions, "portal.view")
  ) {
    return clientIds.includes(clientId);
  }
  return false;
}
