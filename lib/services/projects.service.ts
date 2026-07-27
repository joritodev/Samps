import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { canAccessClient, hasPermission } from "@/lib/permissions/resolve";
import type { SessionUser } from "@/types/auth";

const projectListInclude = {
  client: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true } },
  _count: { select: { checklist: true, demands: true } },
} satisfies Prisma.ProjectInclude;

export type ProjectListItem = Prisma.ProjectGetPayload<{
  include: typeof projectListInclude;
}>;

export async function listProjects(user: SessionUser, clientId?: string): Promise<ProjectListItem[]> {
  const where: Prisma.ProjectWhereInput = {};
  if (clientId) {
    if (!canAccessClient(user.permissions, user.clientIds, clientId)) return [];
    where.clientId = clientId;
  } else if (!hasPermission(user.permissions, "clients.view_all")) {
    where.clientId = { in: user.clientIds };
  }

  return db.project.findMany({
    where,
    include: projectListInclude,
    orderBy: { dueDate: "asc" },
  });
}

export async function getProjectById(user: SessionUser, id: string) {
  const project = await db.project.findUnique({
    where: { id },
    include: {
      client: true,
      owner: { select: { id: true, name: true } },
      checklist: { orderBy: { sortOrder: "asc" } },
      participants: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  if (!project) return null;
  if (!canAccessClient(user.permissions, user.clientIds, project.clientId)) return null;
  return project;
}
