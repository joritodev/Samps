import { db } from "@/lib/db";
import { canAccessClient, hasPermission } from "@/lib/permissions/resolve";
import type { SessionUser } from "@/types/auth";

export async function listShoots(user: SessionUser, clientId?: string) {
  const where: { clientId?: string | { in: string[] } } = {};
  if (clientId) {
    if (!canAccessClient(user.permissions, user.clientIds, clientId)) return [];
    where.clientId = clientId;
  } else if (!hasPermission(user.permissions, "clients.view_all")) {
    where.clientId = { in: user.clientIds };
  }

  return db.shoot.findMany({
    where,
    include: {
      client: { select: { id: true, name: true } },
      participants: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: { date: "asc" },
  });
}
