import { NotificationType, UserStatus, UserType } from "@prisma/client";
import { db } from "@/lib/db";
import { OPEN_EXCLUDED, READY_STATUSES } from "@/lib/agency/demand-filters";
import {
  MAX_OVERDUE_DAYS,
  dedupePlanned,
  notificationKey,
  planDeadlineNotification,
  planUnassignedOverdueDigest,
  type PlannedNotification,
} from "@/lib/agency/deadline-notifications";
import { createNotification } from "@/lib/services/notifications.service";
import { resolveUserClientIds, resolveUserPermissions } from "@/lib/permissions/resolve";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Se o cron rodar duas vezes no mesmo dia, o 2º não repete (janela menor que 24h). */
const DEDUPE_WINDOW_MS = 20 * 60 * 60 * 1000;
const MAX_DEMANDS = 5000;

export type DeadlineRunResult = {
  considered: number;
  planned: number;
  created: number;
  skippedDuplicates: number;
  skippedByPreference: number;
};

/**
 * Avisa o responsável de cada demanda aberta cujo prazo é hoje/amanhã ou que
 * está atrasada. Sem responsável ativo, ninguém recebe (a gestão vê em
 * "Sem responsável"). Respeita a preferência "Prazos" de cada pessoa.
 */
export async function runDeadlineNotifications(
  now: Date = new Date()
): Promise<DeadlineRunResult> {
  const from = new Date(now.getTime() - (MAX_OVERDUE_DAYS + 2) * DAY_MS);
  const to = new Date(now.getTime() + 3 * DAY_MS);

  const demands = await db.demand.findMany({
    where: {
      status: { notIn: OPEN_EXCLUDED },
      assigneeId: { not: null },
      assignee: { status: UserStatus.ACTIVE },
      dueDate: { gte: from, lte: to },
    },
    select: {
      id: true,
      title: true,
      status: true,
      dueDate: true,
      assigneeId: true,
      client: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
    take: MAX_DEMANDS,
  });

  const planned: PlannedNotification[] = [];
  for (const d of demands) {
    if (!d.assigneeId || !d.dueDate) continue;
    const item = planDeadlineNotification(
      {
        id: d.id,
        title: d.title,
        dueDate: d.dueDate,
        assigneeId: d.assigneeId,
        clientName: d.client?.name,
      },
      now,
      { skipNear: READY_STATUSES.includes(d.status) }
    );
    if (item) planned.push(item);
  }
  return deliver(planned, demands.length, now);
}

/** Grava os avisos planejados, pulando duplicatas recentes e quem desligou "Prazos". */
async function deliver(
  planned: PlannedNotification[],
  considered: number,
  now: Date
): Promise<DeadlineRunResult> {
  const unique = dedupePlanned(planned);

  const recent = unique.length
    ? await db.notification.findMany({
        where: {
          userId: { in: Array.from(new Set(unique.map((n) => n.userId))) },
          type: { in: [NotificationType.DEADLINE_NEAR, NotificationType.DEMAND_OVERDUE] },
          createdAt: { gte: new Date(now.getTime() - DEDUPE_WINDOW_MS) },
        },
        select: { userId: true, type: true, link: true },
      })
    : [];
  const already = new Set(
    recent.map((n) => `${n.userId}|${n.type}|${n.link ?? ""}`)
  );

  const result: DeadlineRunResult = {
    considered,
    planned: unique.length,
    created: 0,
    skippedDuplicates: 0,
    skippedByPreference: 0,
  };

  for (const n of unique) {
    if (already.has(notificationKey(n))) {
      result.skippedDuplicates += 1;
      continue;
    }
    const created = await createNotification({
      userId: n.userId,
      type: NotificationType[n.type],
      title: n.title,
      message: n.message,
      link: n.link,
    });
    if (created) result.created += 1;
    else result.skippedByPreference += 1;
  }
  return result;
}

/**
 * Resumo diário para a gestão (Admin e Gestão ativos): quantas demandas
 * atrasadas estão sem responsável, dentro do que cada gestor enxerga.
 */
export async function runUnassignedOverdueDigest(
  now: Date = new Date()
): Promise<DeadlineRunResult> {
  const demands = await db.demand.findMany({
    where: {
      status: { notIn: OPEN_EXCLUDED },
      assigneeId: null,
      dueDate: { lt: now },
    },
    select: { id: true, title: true, clientId: true, dueDate: true },
    orderBy: { dueDate: "asc" },
    take: MAX_DEMANDS,
  });
  if (demands.length === 0) {
    return { considered: 0, planned: 0, created: 0, skippedDuplicates: 0, skippedByPreference: 0 };
  }

  const managers = await db.user.findMany({
    where: {
      status: UserStatus.ACTIVE,
      userType: { in: [UserType.ADMIN, UserType.MANAGEMENT] },
    },
    select: { id: true },
  });
  const scopes = await Promise.all(
    managers.map(async (m) => {
      const [permissions, clientIds] = await Promise.all([
        resolveUserPermissions(m.id),
        resolveUserClientIds(m.id),
      ]);
      return { id: m.id, viewAll: permissions.includes("clients.view_all"), clientIds };
    })
  );

  const planned = planUnassignedOverdueDigest(
    demands.flatMap((d) => (d.dueDate ? [{ id: d.id, title: d.title, clientId: d.clientId, dueDate: d.dueDate }] : [])),
    scopes,
    now
  );
  return deliver(planned, demands.length, now);
}
