import { AuditAction, DemandType, NotificationType, Prisma, ShootStatus, UserStatus, UserType } from "@prisma/client";
import { editingDueDate, parseShootInput, shootTransitionError } from "@/lib/agency/work/shoot-flow";
import { SHOOT_STATUS_LABEL } from "@/lib/agency/labels";
import { toDateKey } from "@/lib/agency/work/dates";
import { db } from "@/lib/db";
import { canAccessClient, hasPermission } from "@/lib/permissions/resolve";
import { listAuditLogs, logAudit } from "@/lib/services/audit.service";
import { createDemand } from "@/lib/services/demands.service";
import { createNotification } from "@/lib/services/notifications.service";
import { refreshProject } from "@/lib/services/projects.service";
import type { SessionUser } from "@/types/auth";

const NOT_FOUND = "Captação não encontrada.";
const DENIED = "Sem permissão para esta ação.";

function clientWhere(user: SessionUser, clientId?: string): Prisma.ShootWhereInput | null {
  if (clientId) {
    return canAccessClient(user.permissions, user.clientIds, clientId) ? { clientId } : null;
  }
  return hasPermission(user.permissions, "clients.view_all") ? {} : { clientId: { in: user.clientIds } };
}

export async function listShoots(user: SessionUser, clientId?: string) {
  const where = clientWhere(user, clientId);
  if (!where) return [];
  return db.shoot.findMany({
    where,
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, title: true } },
      participants: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { demands: true } },
    },
    orderBy: { date: "asc" },
  });
}

/** Captações que ainda aceitam demanda de edição, para o seletor de nova demanda. */
export async function listOpenShootOptions(user: SessionUser) {
  const where = clientWhere(user);
  if (!where) return [];
  return db.shoot.findMany({
    where: { ...where, status: { notIn: ["CANCELLED"] } },
    select: { id: true, title: true, clientId: true, date: true },
    orderBy: { date: "desc" },
    take: 100,
  });
}

export async function getShootDetail(user: SessionUser, id: string) {
  const shoot = await db.shoot.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
      project: { select: { id: true, title: true } },
      participants: { include: { user: { select: { id: true, name: true } } } },
      demands: {
        where: { isChecklistItem: false },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
          assignee: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!shoot || !canAccessClient(user.permissions, user.clientIds, shoot.clientId)) return null;
  const history = await listAuditLogs({ entityType: "Shoot", entityId: id, limit: 30 });
  return { shoot, history };
}

function assertCanWrite(user: SessionUser) {
  if (user.userType === UserType.EXTERNAL_CLIENT || !hasPermission(user.permissions, "shoots.create")) {
    throw new Error(DENIED);
  }
}

async function requireInternalUsers(rawIds: string[]) {
  // Responsável que também está na lista de participantes conta uma vez só.
  const ids = Array.from(new Set(rawIds));
  if (ids.length === 0) return;
  const found = await db.user.count({
    where: { id: { in: ids }, status: UserStatus.ACTIVE, userType: { not: UserType.EXTERNAL_CLIENT } },
  });
  if (found !== ids.length) throw new Error("Responsável ou participante inválido.");
}

async function requireProject(projectId: string | null, clientId: string) {
  if (!projectId) return;
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { clientId: true, status: true },
  });
  if (!project || project.clientId !== clientId) throw new Error("Projeto não encontrado para este cliente.");
  if (project.status === "COMPLETED" || project.status === "CANCELLED") {
    throw new Error("Este projeto está encerrado.");
  }
}

async function safeAudit(params: Parameters<typeof logAudit>[0]) {
  try {
    await logAudit(params);
  } catch (error) {
    console.error("[captações] falha ao registrar histórico", error);
  }
}

async function notify(user: SessionUser, userIds: string[], title: string, message: string, shootId: string) {
  const targets = Array.from(new Set(userIds)).filter((id) => id !== user.id);
  await Promise.all(
    targets.map((userId) =>
      createNotification({
        userId,
        type: NotificationType.SHOOT_SCHEDULED,
        title,
        message,
        link: `/captacoes/${shootId}`,
      }).catch((error) => console.error("[captações] notificação falhou", error))
    )
  );
}

/** Quem trabalha na captação: responsável e equipe. */
async function shootPeople(shootId: string): Promise<string[]> {
  const row = await db.shoot.findUnique({
    where: { id: shootId },
    select: { ownerId: true, participants: { select: { userId: true } } },
  });
  return [...(row?.ownerId ? [row.ownerId] : []), ...(row?.participants.map((p) => p.userId) ?? [])];
}

/** Demanda de edição ligada à captação: setor Vídeo, prazo 5 dias úteis depois da gravação. */
async function createEditingDemandFor(
  user: SessionUser,
  shoot: { id: string; title: string; clientId: string; projectId: string | null; date: Date; materialUrl: string | null }
) {
  const [sector, priority] = await Promise.all([
    db.sector.findFirst({ where: { slug: "video", isActive: true }, select: { id: true } }),
    db.priorityLevel.findFirst({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true } }),
  ]);
  return createDemand(user, {
    clientId: shoot.clientId,
    title: `Edição: ${shoot.title}`,
    description: shoot.materialUrl ? `Material bruto: ${shoot.materialUrl}` : "Material bruto será liberado ao concluir a captação.",
    type: DemandType.VIDEO,
    dueDate: editingDueDate(shoot.date),
    sectorId: sector?.id,
    priorityId: priority?.id,
    projectId: shoot.projectId ?? undefined,
    shootId: shoot.id,
  });
}

export async function createShoot(user: SessionUser, raw: Record<string, unknown>) {
  assertCanWrite(user);
  const parsed = parseShootInput(raw);
  if (!parsed.ok) throw new Error(parsed.error);
  const input = parsed.value;
  if (!canAccessClient(user.permissions, user.clientIds, input.clientId)) throw new Error("Cliente não encontrado.");
  await requireInternalUsers([...(input.ownerId ? [input.ownerId] : []), ...input.participantIds]);
  await requireProject(input.projectId, input.clientId);
  if (input.createEditingDemand && !hasPermission(user.permissions, "demands.create")) {
    throw new Error("Seu acesso não permite criar a demanda de edição junto com a captação.");
  }

  const shoot = await db.shoot.create({
    data: {
      clientId: input.clientId,
      title: input.title,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
      ownerId: input.ownerId ?? user.id,
      shootType: input.shootType,
      notes: input.notes,
      projectId: input.projectId,
      participants: { create: input.participantIds.map((userId) => ({ userId })) },
    },
    select: { id: true, title: true, clientId: true, projectId: true, date: true, materialUrl: true },
  });

  await safeAudit({
    userId: user.id,
    action: AuditAction.SHOOT_CREATED,
    entityType: "Shoot",
    entityId: shoot.id,
    newValue: { title: shoot.title, date: toDateKey(shoot.date) },
    origin: "captacoes",
  });

  let editingDemandId: string | null = null;
  if (input.createEditingDemand) {
    const demand = await createEditingDemandFor(user, shoot);
    editingDemandId = demand.id;
    if (shoot.projectId) await refreshProject(shoot.projectId);
  }
  return { id: shoot.id, editingDemandId };
}

export async function updateShoot(user: SessionUser, id: string, raw: Record<string, unknown>) {
  assertCanWrite(user);
  const parsed = parseShootInput(raw);
  if (!parsed.ok) throw new Error(parsed.error);
  const input = parsed.value;

  const current = await db.shoot.findUnique({
    where: { id },
    include: { participants: { select: { userId: true } } },
  });
  if (!current || !canAccessClient(user.permissions, user.clientIds, current.clientId)) throw new Error(NOT_FOUND);
  if (current.clientId !== input.clientId) throw new Error("O cliente da captação não pode ser trocado.");
  if (current.status === "COMPLETED" || current.status === "CANCELLED") {
    throw new Error("Captação encerrada não pode ser editada. Reabra-a primeiro.");
  }
  await requireInternalUsers([...(input.ownerId ? [input.ownerId] : []), ...input.participantIds]);
  await requireProject(input.projectId, input.clientId);

  const changes: string[] = [];
  if (current.title !== input.title) changes.push("título");
  if (toDateKey(current.date) !== toDateKey(input.date)) changes.push("data");
  if ((current.startTime ?? null) !== input.startTime || (current.endTime ?? null) !== input.endTime) changes.push("horário");
  if ((current.location ?? null) !== input.location) changes.push("local");
  if ((current.projectId ?? null) !== input.projectId) changes.push("projeto");
  const before = new Set(current.participants.map((p) => p.userId));
  const added = input.participantIds.filter((uid) => !before.has(uid));
  if (added.length || current.participants.some((p) => !input.participantIds.includes(p.userId))) changes.push("equipe");

  await db.$transaction([
    db.shoot.update({
      where: { id },
      data: {
        title: input.title,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        location: input.location,
        ownerId: input.ownerId,
        shootType: input.shootType,
        notes: input.notes,
        projectId: input.projectId,
      },
    }),
    db.shootParticipant.deleteMany({ where: { shootId: id, userId: { notIn: input.participantIds } } }),
    db.shootParticipant.createMany({
      data: added.map((userId) => ({ shootId: id, userId })),
      skipDuplicates: true,
    }),
  ]);

  if (changes.length) {
    await safeAudit({
      userId: user.id,
      action: AuditAction.SHOOT_UPDATED,
      entityType: "Shoot",
      entityId: id,
      newValue: { description: `Editou ${changes.join(", ")}` },
      origin: "captacoes",
    });
    if (changes.includes("data") || changes.includes("horário") || changes.includes("local")) {
      await notify(user, await shootPeople(id), "Captação alterada", `${input.title}: ${changes.join(", ")}`, id);
    }
  }
  if (current.projectId && current.projectId !== input.projectId) await refreshProject(current.projectId);
  if (input.projectId) await refreshProject(input.projectId);
  return { id };
}

export async function changeShootStatus(
  user: SessionUser,
  id: string,
  to: ShootStatus,
  extra: { materialUrl?: string | null } = {}
) {
  assertCanWrite(user);
  const shoot = await db.shoot.findUnique({
    where: { id },
    select: { id: true, title: true, clientId: true, status: true, projectId: true },
  });
  if (!shoot || !canAccessClient(user.permissions, user.clientIds, shoot.clientId)) throw new Error(NOT_FOUND);

  const materialUrl = extra.materialUrl?.trim() || null;
  const error = shootTransitionError(shoot.status, to, materialUrl);
  if (error) throw new Error(error);

  await db.shoot.update({
    where: { id },
    data: {
      status: to,
      ...(to === "COMPLETED" ? { materialUrl, completedAt: new Date() } : {}),
      ...(to === "PLANNED" ? { completedAt: null } : {}),
    },
  });

  await safeAudit({
    userId: user.id,
    action: to === "COMPLETED" ? AuditAction.SHOOT_COMPLETED : AuditAction.SHOOT_UPDATED,
    entityType: "Shoot",
    entityId: id,
    previousValue: { status: shoot.status },
    newValue: { status: to, description: `Status: ${SHOOT_STATUS_LABEL[shoot.status]} → ${SHOOT_STATUS_LABEL[to]}` },
    origin: "captacoes",
  });

  if (to === "SCHEDULED") {
    await notify(user, await shootPeople(id), "Captação agendada", shoot.title, id);
  } else if (to === "CANCELLED") {
    await notify(user, await shootPeople(id), "Captação cancelada", shoot.title, id);
  } else if (to === "COMPLETED") {
    // O editor precisa saber que o material chegou: demandas de edição ligadas e a equipe.
    const demands = await db.demand.findMany({
      where: { shootId: id, assigneeId: { not: null } },
      select: { assigneeId: true },
    });
    await db.demand.updateMany({
      where: { shootId: id },
      data: { materialUrl },
    });
    await notify(
      user,
      [...demands.map((d) => d.assigneeId as string), ...(await shootPeople(id))],
      "Material da captação disponível",
      shoot.title,
      id
    );
  }
  return { id, status: to };
}

/** Cria (mais uma) demanda de edição para uma captação que já existe. */
export async function addEditingDemand(user: SessionUser, shootId: string) {
  assertCanWrite(user);
  if (!hasPermission(user.permissions, "demands.create")) throw new Error(DENIED);
  const shoot = await db.shoot.findUnique({
    where: { id: shootId },
    select: { id: true, title: true, clientId: true, projectId: true, date: true, materialUrl: true, status: true },
  });
  if (!shoot || !canAccessClient(user.permissions, user.clientIds, shoot.clientId)) throw new Error(NOT_FOUND);
  if (shoot.status === "CANCELLED") throw new Error("Captação cancelada.");
  const demand = await createEditingDemandFor(user, shoot);
  if (shoot.projectId) await refreshProject(shoot.projectId);
  await safeAudit({
    userId: user.id,
    action: AuditAction.SHOOT_UPDATED,
    entityType: "Shoot",
    entityId: shootId,
    newValue: { description: `Criou a demanda de edição "${demand.title}"` },
    origin: "captacoes",
  });
  return { id: demand.id };
}
