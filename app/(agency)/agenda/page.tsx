import { AgendaView } from "@/components/agency/agenda-view";
import { mapDemandsToAgendaEvents } from "@/lib/agency/agenda-events";
import { requireAuth } from "@/lib/permissions/check";
import { listDemands } from "@/lib/services/demands.service";

export default async function AgendaPage() {
  const user = await requireAuth();
  const demands = await listDemands(user, { context: "calendar" });
  const events = mapDemandsToAgendaEvents(demands);

  return <AgendaView events={events} />;
}
