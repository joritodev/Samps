import { ClientStatus, UserStatus, UserType } from "@prisma/client";
import { db } from "@/lib/db";
import { clientScopeFilter } from "@/lib/permissions/check";
import type { SessionUser } from "@/types/auth";

export type WorkFormOptions = {
  clients: { id: string; name: string }[];
  users: { id: string; name: string }[];
};

/** Clientes visíveis ao usuário e equipe interna ativa, para os formulários de projeto e captação. */
export async function listWorkFormOptions(user: SessionUser): Promise<WorkFormOptions> {
  const scope = clientScopeFilter(user);
  const [clients, users] = await Promise.all([
    db.client.findMany({
      where: { status: ClientStatus.ACTIVE, ...(scope ? { id: scope } : {}) },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.user.findMany({
      where: { status: UserStatus.ACTIVE, userType: { not: UserType.EXTERNAL_CLIENT } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  return { clients, users };
}
