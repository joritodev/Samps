import { ClientStatus, UserStatus } from "@prisma/client";
import { isBirthdayToday } from "@/lib/agency/birthdays";
import { db } from "@/lib/db";

/** Idade que a pessoa faz hoje (null se a data não tem ano plausível). */
function ageOn(birthDate: Date | null, now: Date = new Date()) {
  if (!birthDate) return null;
  const age = now.getFullYear() - birthDate.getFullYear();
  return age > 0 && age < 120 ? age : null;
}

export async function listActiveAnnouncements(now: Date = new Date()) {
  return db.announcement.findMany({
    where: {
      active: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    orderBy: [{ kind: "asc" }, { startsAt: "desc" }],
    include: { author: { select: { name: true } } },
  });
}

export async function listAllAnnouncements() {
  return db.announcement.findMany({
    orderBy: [{ active: "desc" }, { startsAt: "desc" }],
    include: { author: { select: { name: true } } },
  });
}

export async function listTodayBirthdays(clientScope?: { in: string[] }) {
  const [clients, users] = await Promise.all([
    db.client.findMany({
      where: {
        status: ClientStatus.ACTIVE,
        birthDate: { not: null },
        ...(clientScope ? { id: clientScope } : {}),
      },
      select: { id: true, name: true, birthDate: true },
    }),
    db.user.findMany({
      where: { status: UserStatus.ACTIVE, birthDate: { not: null } },
      select: { id: true, name: true, birthDate: true },
    }),
  ]);

  return [
    ...clients
      .filter((c) => isBirthdayToday(c.birthDate))
      .map((c) => ({
        id: c.id,
        name: c.name,
        kindOf: "client" as const,
        age: ageOn(c.birthDate),
      })),
    ...users
      .filter((u) => isBirthdayToday(u.birthDate))
      .map((u) => ({
        id: u.id,
        name: u.name,
        kindOf: "user" as const,
        age: ageOn(u.birthDate),
      })),
  ];
}
