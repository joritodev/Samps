import { ClientStatus, UserStatus } from "@prisma/client";
import { AgendaView } from "@/components/agency/agenda-view";
import { mapDemandsToAgendaEvents } from "@/lib/agency/agenda-events";
import { mapBirthdaysToAgendaEvents } from "@/lib/agency/birthdays";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/permissions/check";
import { listDemands } from "@/lib/services/demands.service";

export default async function AgendaPage() {
  const user = await requireAuth();
  const [demands, clients, teammates] = await Promise.all([
    listDemands(user, { context: "calendar" }),
    db.client.findMany({
      where: { status: ClientStatus.ACTIVE, birthDate: { not: null } },
      select: { id: true, name: true, birthDate: true },
    }),
    db.user.findMany({
      where: { status: UserStatus.ACTIVE, birthDate: { not: null } },
      select: { id: true, name: true, birthDate: true },
    }),
  ]);

  const year = new Date().getUTCFullYear();
  const events = [
    ...mapDemandsToAgendaEvents(demands),
    ...mapBirthdaysToAgendaEvents(
      [
        ...clients.map((c) => ({
          id: c.id,
          name: c.name,
          birthDate: c.birthDate!,
          kindOf: "client" as const,
        })),
        ...teammates.map((u) => ({
          id: u.id,
          name: u.name,
          birthDate: u.birthDate!,
          kindOf: "user" as const,
        })),
      ],
      year
    ),
  ];

  return <AgendaView events={events} />;
}
