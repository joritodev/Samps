import { ClientStatus, Prisma, UserType } from "@prisma/client";
import { db } from "@/lib/db";
import { canAccessClient, hasPermission } from "@/lib/permissions/resolve";
import type { SessionUser } from "@/types/auth";

export async function listClients(user: SessionUser, search?: string) {
  const where: Prisma.ClientWhereInput = {};

  if (!hasPermission(user.permissions, "clients.view_all")) {
    where.id = { in: user.clientIds };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { tradeName: { contains: search, mode: "insensitive" } },
      { segment: { contains: search, mode: "insensitive" } },
    ];
  }

  const clients = await db.client.findMany({
    where,
    include: {
      socialMedia: { select: { id: true, name: true, avatarUrl: true } },
      primaryResponsible: { select: { id: true, name: true } },
      _count: { select: { demands: true } },
      board: { select: { id: true, status: true } },
      contracts: { where: { status: "ACTIVE" }, take: 1 },
    },
    orderBy: { name: "asc" },
  });

  if (clients.length === 0) return [];

  const overdueGroups = await db.demand.groupBy({
    by: ["clientId"],
    where: {
      clientId: { in: clients.map((c) => c.id) },
      status: { not: "DONE" },
      dueDate: { lt: new Date() },
    },
    _count: { _all: true },
  });

  const overdueByClient = Object.fromEntries(
    overdueGroups.map((g) => [g.clientId, g._count._all])
  );

  return clients.map((client) => ({
    ...client,
    overdueCount: overdueByClient[client.id] ?? 0,
  }));
}

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
