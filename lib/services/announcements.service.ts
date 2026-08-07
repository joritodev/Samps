import { ClientStatus, UserStatus } from "@prisma/client";
import { isBirthdayToday } from "@/lib/agency/birthdays";
import { db } from "@/lib/db";

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

export async function listTodayBirthdays() {
  const [clients, users] = await Promise.all([
    db.client.findMany({
      where: { status: ClientStatus.ACTIVE, birthDate: { not: null } },
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
      .map((c) => ({ id: c.id, name: c.name, kindOf: "client" as const })),
    ...users
      .filter((u) => isBirthdayToday(u.birthDate))
      .map((u) => ({ id: u.id, name: u.name, kindOf: "user" as const })),
  ];
}
