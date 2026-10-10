import { AuditAction, NotificationType, Prisma, UserStatus, UserType } from "@prisma/client";
import { isDemandClosed, parseProjectInput, projectProgress, projectTransitionError, suggestProjectStatus, type ProjectInput } from "@/lib/agency/work/project-flow";
import { PROJECT_STATUS_LABEL } from "@/lib/agency/labels";
import { toDateKey } from "@/lib/agency/work/dates";
import { db } from "@/lib/db";
import { guardDemand } from "@/lib/permissions/demand-guard";
import { canAccessClient, hasPermission } from "@/lib/permissions/resolve";
import { logAudit, listAuditLogs } from "@/lib/services/audit.service";
import { createNotification } from "@/lib/services/notifications.service";
import type { SessionUser } from "@/types/auth";

const NOT_FOUND = "Projeto não encontrado.";
const DENIED = "Sem permissão para esta ação.";

const projectListInclude = {
  client: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true } },
  demands: { select: { status: true } },
  _count: { select: { checklist: true, demands: true } },
} satisfies Prisma.ProjectInclude;

export type ProjectListItem = Prisma.ProjectGetPayload<{
  include: typeof projectListInclude;
}>;

function isManagement(user: SessionUser) {
  return user.userType === UserType.ADMIN || user.userType === UserType.MANAGEMENT;
}

function clientWhere(user: SessionUser, clientId?: string): Prisma.ProjectWhereInput | null {
  if (clientId) {
    return canAccessClient(user.permissions, user.clientIds, clientId) ? { clientId } : null;
  }
  return hasPermission(user.permissions, "clients.view_all") ? {} : { clientId: { in: user.clientIds } };
}

export async function listProjects(user: SessionUser, clientId?: string): Promise<ProjectListItem[]> {
  const where = clientWhere(user, clientId);
  if (!where) return [];
  return db.project.findMany({
    where,
    include: projectListInclude,
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
  });
}

/** Projetos que ainda aceitam demanda nova, para os seletores. */
export async function listOpenProjectOptions(user: SessionUser) {
  const where = clientWhere(user);
  if (!where) return [];
  return db.project.findMany({
    where: { ...where, status: { in: ["PLANNING", "ACTIVE", "ON_HOLD"] } },
    select: { id: true, title: true, clientId: true },
    orderBy: { title: "asc" },
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

export async function getProjectDetail(user: SessionUser, id: string) {
  const project = await db.project.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
      participants: { include: { user: { select: { id: true, name: true } } } },
      demands: {
        where: { isChecklistItem: false },
        orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          status: true,
          type: true,
          dueDate: true,
          assignee: { select: { id: true, name: true } },
          sector: { select: { id: true, name: true } },
        },
      },
      shoots: {
        orderBy: { date: "asc" },
        select: { id: true, title: true, date: true, status: true },
      },
    },
  });
  if (!project || !canAccessClient(user.permissions, user.clientIds, project.clientId)) return null;

  const progress = projectProgress(project.demands.map((d) => d.status));
  const suggestion = suggestProjectStatus({
    status: project.status,
    progress,
    startDate: project.startDate,
    now: new Date(),
  });
  const history = await listAuditLogs({ entityType: "Project", entityId: id, limit: 30 });
  return { project, progress, suggestion, history };
}

async function requireInternalUsers(rawIds: string[]) {
  // Responsável que também está na lista de participantes conta uma vez só.
  const ids = Array.from(new Set(rawIds));
  if (ids.length === 0) return;
  const found = await db.user.count({
    where: {
      id: { in: ids },
      status: UserStatus.ACTIVE,
      userType: { not: UserType.EXTERNAL_CLIENT },
    },
  });
  if (found !== ids.length) throw new Error("Responsável ou participante inválido.");
}

function assertCanWrite(user: SessionUser) {
  if (user.userType === UserType.EXTERNAL_CLIENT || !hasPermission(user.permissions, "projects.create")) {
    throw new Error(DENIED);
  }
}

async function safeAudit(params: Parameters<typeof logAudit>[0]) {
  try {
    await logAudit(params);
  } catch (error) {
    // O histórico não pode desfazer nem mascarar uma alteração que já foi gravada.
    console.error("[projetos] falha ao registrar histórico", error);
  }
}

/** Grava o progresso (cache da lista) e aplica a mudança automática de status. */
export async function refreshProject(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, status: true, startDate: true, progress: true, demands: { select: { status: true } } },
  });
  if (!project) return null;
  const progress = projectProgress(project.demands.map((d) => d.status));
  const suggestion = suggestProjectStatus({
    status: project.status,
    progress,
    startDate: project.startDate,
    now: new Date(),
  });
  const nextStatus = suggestion?.auto ? suggestion.next : project.status;
  if (progress.percent !== project.progress || nextStatus !== project.status) {
    await db.project.update({
      where: { id: projectId },
      data: { progress: progress.percent, status: nextStatus },
    });
  }
  return { progress, status: nextStatus };
}

export async function createProject(user: SessionUser, raw: Record<string, unknown>) {
  assertCanWrite(user);
  const parsed = parseProjectInput(raw);
  if (!parsed.ok) throw new Error(parsed.error);
  const input = parsed.value;
  if (!canAccessClient(user.permissions, user.clientIds, input.clientId)) throw new Error("Cliente não encontrado.");
  await requireInternalUsers([...(input.ownerId ? [input.ownerId] : []), ...input.participantIds]);

  const project = await db.project.create({
    data: {
      clientId: input.clientId,
      title: input.title,
      description: input.description,
      ownerId: input.ownerId ?? user.id,
      startDate: input.startDate,
      dueDate: input.dueDate,
      outsideContract: input.outsideContract,
      participants: { create: input.participantIds.map((userId) => ({ userId })) },
    },
    select: { id: true, title: true, clientId: true },
  });

  await safeAudit({
    userId: user.id,
    action: AuditAction.PROJECT_CREATED,
    entityType: "Project",
    entityId: project.id,
    newValue: { title: project.title, outsideContract: input.outsideContract },
    origin: "projetos",
  });
  await notifyProjectTeam(user, project.id, project.title, "Você foi incluído no projeto", [
    ...(input.ownerId && input.ownerId !== user.id ? [input.ownerId] : []),
    ...input.participantIds,
  ]);
  return project;
}

function describeProjectChanges(
  before: { title: string; description: string | null; ownerId: string | null; startDate: Date | null; dueDate: Date | null; outsideContract: boolean },
  input: ProjectInput
) {
  const changes: string[] = [];
  if (before.title !== input.title) changes.push("título");
  if ((before.description ?? null) !== input.description) changes.push("descrição");
  if ((before.ownerId ?? null) !== (input.ownerId ?? before.ownerId)) changes.push("responsável");
  if (toDateKey(before.startDate) !== toDateKey(input.startDate)) changes.push("início");
  if (toDateKey(before.dueDate) !== toDateKey(input.dueDate)) changes.push("prazo");
  if (before.outsideContract !== input.outsideContract) changes.push("fora do contrato");
  return changes;
}

export async function updateProject(user: SessionUser, id: string, raw: Record<string, unknown>) {
  assertCanWrite(user);
  const parsed = parseProjectInput(raw);
  if (!parsed.ok) throw new Error(parsed.error);
  const input = parsed.value;

  const current = await db.project.findUnique({
    where: { id },
    include: { participants: { select: { userId: true } } },
  });
  if (!current || !canAccessClient(user.permissions, user.clientIds, current.clientId)) throw new Error(NOT_FOUND);
  if (current.clientId !== input.clientId) throw new Error("O cliente do projeto não pode ser trocado.");
  await requireInternalUsers([...(input.ownerId ? [input.ownerId] : []), ...input.participantIds]);

  const changes = describeProjectChanges(current, input);
  const before = new Set(current.participants.map((p) => p.userId));
  const added = input.participantIds.filter((uid) => !before.has(uid));
  const removed = current.participants.filter((p) => !input.participantIds.includes(p.userId));
  if (added.length || removed.length) changes.push("participantes");

  await db.$transaction([
    db.project.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        ownerId: input.ownerId,
        startDate: input.startDate,
        dueDate: input.dueDate,
        outsideContract: input.outsideContract,
      },
    }),
    db.projectParticipant.deleteMany({ where: { projectId: id, userId: { notIn: input.participantIds } } }),
    db.projectParticipant.createMany({
      data: added.map((userId) => ({ projectId: id, userId })),
      skipDuplicates: true,
    }),
  ]);

  if (changes.length) {
    await safeAudit({
      userId: user.id,
      action: AuditAction.PROJECT_UPDATED,
      entityType: "Project",
      entityId: id,
      newValue: { description: `Editou ${changes.join(", ")}` },
      origin: "projetos",
    });
  }
  await notifyProjectTeam(user, id, input.title, "Você foi incluído no projeto", added);
  return { id };
}

export async function changeProjectStatus(
  user: SessionUser,
  id: string,
  to: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED"
) {
  assertCanWrite(user);
  if ((to === "COMPLETED" || to === "CANCELLED") && !isManagement(user)) {
    throw new Error("Só a gestão conclui ou cancela um projeto.");
  }
  const project = await db.project.findUnique({
    where: { id },
    select: { id: true, title: true, clientId: true, status: true, demands: { select: { status: true } } },
  });
  if (!project || !canAccessClient(user.permissions, user.clientIds, project.clientId)) throw new Error(NOT_FOUND);

  const progress = projectProgress(project.demands.map((d) => d.status));
  const error = projectTransitionError(project.status, to, progress);
  if (error) throw new Error(error);

  await db.project.update({ where: { id }, data: { status: to, progress: progress.percent } });
  await safeAudit({
    userId: user.id,
    action: AuditAction.PROJECT_UPDATED,
    entityType: "Project",
    entityId: id,
    previousValue: { status: project.status },
    newValue: { status: to, description: `Status: ${PROJECT_STATUS_LABEL[project.status]} → ${PROJECT_STATUS_LABEL[to]}` },
    origin: "projetos",
  });
  const people = await db.project.findUnique({
    where: { id },
    select: { ownerId: true, participants: { select: { userId: true } } },
  });
  await notifyProjectTeam(
    user,
    id,
    project.title,
    to === "COMPLETED" ? "Projeto concluído" : to === "CANCELLED" ? "Projeto cancelado" : "Status do projeto alterado",
    [...(people?.ownerId ? [people.ownerId] : []), ...(people?.participants.map((p) => p.userId) ?? [])]
  );
  return { id, status: to };
}

async function notifyProjectTeam(user: SessionUser, projectId: string, title: string, headline: string, userIds: string[]) {
  const targets = Array.from(new Set(userIds)).filter((uid) => uid !== user.id);
  await Promise.all(
    targets.map((userId) =>
      createNotification({
        userId,
        type: NotificationType.PROJECT_UPDATED,
        title: headline,
        message: title,
        link: `/projetos/${projectId}`,
      }).catch((error) => console.error("[projetos] notificação falhou", error))
    )
  );
}

/** Liga (ou desliga, com `projectId` nulo) uma demanda a um projeto do mesmo cliente. */
export async function linkDemandToProject(user: SessionUser, demandId: string, projectId: string | null) {
  assertCanWrite(user);
  const guard = await guardDemand(user, demandId, { permission: "demands.edit" });
  if (!guard.ok) throw new Error(guard.error);

  const current = await db.demand.findUnique({ where: { id: demandId }, select: { projectId: true, title: true } });
  if (!current) throw new Error("Demanda não encontrada.");

  if (projectId) {
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { id: true, clientId: true, status: true, title: true },
    });
    if (!project || project.clientId !== guard.demand.clientId) throw new Error(NOT_FOUND);
    if (project.status === "COMPLETED" || project.status === "CANCELLED") {
      throw new Error("Este projeto está encerrado. Reabra-o para ligar demandas.");
    }
  }
  if ((current.projectId ?? null) === projectId) return { demandId };

  await db.demand.update({ where: { id: demandId }, data: { projectId } });
  for (const pid of [current.projectId, projectId]) {
    if (pid) await refreshProject(pid);
  }
  await safeAudit({
    userId: user.id,
    action: AuditAction.PROJECT_UPDATED,
    entityType: "Project",
    entityId: projectId ?? current.projectId ?? undefined,
    newValue: {
      description: projectId ? `Demanda "${current.title}" ligada ao projeto` : `Demanda "${current.title}" removida do projeto`,
    },
    origin: "projetos",
  });
  return { demandId };
}

/** Demandas abertas do cliente que ainda não estão em nenhum projeto. */
export async function listLinkableDemandsForProject(user: SessionUser, projectId: string) {
  const project = await db.project.findUnique({ where: { id: projectId }, select: { clientId: true } });
  if (!project || !canAccessClient(user.permissions, user.clientIds, project.clientId)) return [];
  const rows = await db.demand.findMany({
    where: {
      clientId: project.clientId,
      projectId: null,
      isChecklistItem: false,
      status: { notIn: ["DONE", "PUBLISHED", "DELIVERED", "CANCELLED"] },
    },
    select: { id: true, title: true, status: true, dueDate: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.filter((r) => !isDemandClosed(r.status));
}
