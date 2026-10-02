import { ClientStatus, UserType } from "@prisma/client";
import { db } from "@/lib/db";
import { canAccessClient, hasPermission } from "@/lib/permissions/resolve";
import type { SessionUser } from "@/types/auth";

export async function getClientById(user: SessionUser, id: string) {
  if (!canAccessClient(user.permissions, user.clientIds, id)) {
    if (user.userType !== UserType.EXTERNAL_CLIENT) return null;
    if (!user.clientIds.includes(id)) return null;
  }

  return db.client.findUnique({
    where: { id },
    include: {
      socialMedia: { select: { id: true, name: true, email: true } },
      primaryResponsible: { select: { id: true, name: true } },
      contracts: { include: { services: true } },
      userLinks: {
        include: { user: { select: { id: true, name: true, email: true, userType: true } } },
      },
    },
  });
}

export async function createClient(
  user: SessionUser,
  data: {
    name: string;
    legalName?: string;
    tradeName?: string;
    segment?: string;
    email?: string;
    phone?: string;
    brandColor?: string;
    socialMediaId?: string;
    startedAt?: Date;
    internalNotes?: string;
  }
) {
  if (!hasPermission(user.permissions, "clients.create")) {
    throw new Error("Sem permissão");
  }

  return db.client.create({
    data: {
      ...data,
      primaryResponsibleId: user.id,
      status: ClientStatus.ACTIVE,
    },
  });
}
