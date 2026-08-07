import { ClientStatus, UserStatus } from "@prisma/client";
import { AgendaView } from "@/components/agency/agenda-view";
import { mapAbsencesToAgendaEvents } from "@/lib/agency/absences";
import { mapDemandsToAgendaEvents } from "@/lib/agency/agenda-events";
import { mapBirthdaysToAgendaEvents } from "@/lib/agency/birthdays";
import { db } from "@/lib/db";
import { clientScopeFilter, requireAuth } from "@/lib/permissions/check";
import { listAbsences } from "@/lib/services/absences.service";
import { listDemands } from "@/lib/services/demands.service";

export default async function AgendaPage() {
  const user = await requireAuth();
  const clientScope = clientScopeFilter(user);
  const year = new Date().getUTCFullYear();
  const rangeFrom = new Date(Date.UTC(year, 0, 1));
  const rangeTo = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  const [demands, clients, teammates, absences] = await Promise.all([
    listDemands(user, { context: "calendar" }),
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
    listAbsences({ from: rangeFrom, to: rangeTo }),
  ]);

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
    ...mapAbsencesToAgendaEvents(absences),
  ];

  return <AgendaView events={events} />;
}
