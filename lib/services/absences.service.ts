import { db } from "@/lib/db";
import { isAbsentOn } from "@/lib/agency/absences";

const userSelect = {
  id: true,
  name: true,
  avatarUrl: true,
  sector: { select: { id: true, name: true } },
} as const;

/** Ausências com interseção no intervalo [from, to], não canceladas. */
export async function listAbsences(params: { from: Date; to: Date }) {
  return db.absence.findMany({
    where: {
      canceledAt: null,
      startsAt: { lte: params.to },
      endsAt: { gte: params.from },
    },
    include: { user: { select: userSelect } },
    orderBy: { startsAt: "asc" },
  });
}

/** Ausências ativas no dia de `now` (comparação inclusiva por dia UTC). */
export async function listActiveAbsences(now: Date = new Date()) {
  const dayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

  const rows = await db.absence.findMany({
    where: {
      canceledAt: null,
      startsAt: { lte: dayEnd },
      endsAt: { gte: dayStart },
    },
    include: { user: { select: userSelect } },
    orderBy: { startsAt: "asc" },
  });

  return rows.filter((row) => isAbsentOn(row, now));
}
