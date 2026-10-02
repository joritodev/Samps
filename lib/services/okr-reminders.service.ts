import { dayKey, startOfDayMs } from "@/lib/agency/sp-calendar";
import { findStaleCheckIns, type StaleCheckIn } from "@/lib/agency/okr";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/services/notifications.service";
import { listAllRunningObjectives } from "@/lib/services/okr.service";

const TITLE = "Check-ins pendentes";

/** Resultados-chave manuais sem check-in há 7 dias ou mais, em todos os objetivos em andamento. */
export async function getPendingCheckIns(now: Date = new Date()): Promise<StaleCheckIn[]> {
  const rows = await listAllRunningObjectives(now);
  return findStaleCheckIns(
    rows.map((o) => ({
      id: o.id,
      title: o.title,
      ownerId: o.ownerId,
      ownerName: o.owner.name,
      startsOn: o.startsOn,
      keyResults: o.keyResults.map((kr) => ({
        id: kr.id,
        title: kr.title,
        kind: kr.kind,
        lastCheckInAt: kr.checkIns[0]?.createdAt ?? null,
      })),
    })),
    now
  );
}

export type ReminderResult = { owners: number; notified: number; duplicates: number };

/** Uma notificação por dono com a contagem de pendências; não repete no mesmo dia. */
export async function runOkrCheckInReminders(now: Date = new Date()): Promise<ReminderResult> {
  const pending = await getPendingCheckIns(now);
  const byOwner = new Map<string, StaleCheckIn[]>();
  for (const p of pending) byOwner.set(p.ownerId, [...(byOwner.get(p.ownerId) ?? []), p]);

  const result: ReminderResult = { owners: byOwner.size, notified: 0, duplicates: 0 };
  const today = new Date(startOfDayMs(dayKey(now)));

  for (const [ownerId, items] of Array.from(byOwner)) {
    const already = await db.notification.findFirst({
      where: { userId: ownerId, title: TITLE, createdAt: { gte: today } },
      select: { id: true },
    });
    if (already) {
      result.duplicates += 1;
      continue;
    }
    const objectives = new Set(items.map((i) => i.objectiveTitle)).size;
    const message = `${items.length} ${items.length === 1 ? "resultado-chave sem atualização" : "resultados-chave sem atualização"} há 7 dias ou mais, em ${objectives} ${objectives === 1 ? "objetivo" : "objetivos"}. Registre o check-in da semana.`;
    const created = await createNotification({ userId: ownerId, type: "OTHER", title: TITLE, message, link: "/performance/okrs" });
    if (created) result.notified += 1;
  }
  return result;
}
