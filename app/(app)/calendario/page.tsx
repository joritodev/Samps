import { requireAuth } from "@/lib/permissions/check";
import { listDemands } from "@/lib/services/demands.service";
import {
  AgencyCalendar,
  type CalendarDemand,
} from "@/components/calendar/agency-calendar";

export default async function CalendarioPage() {
  const user = await requireAuth();
  const demands = await listDemands(user, { context: "calendar" });

  const payload: CalendarDemand[] = demands.map((d) => ({
    id: d.id,
    title: d.title,
    type: d.type,
    status: d.status,
    format: d.format,
    dueDate: d.dueDate?.toISOString() ?? null,
    deliveryDate: d.deliveryDate?.toISOString() ?? null,
    publishDate: d.publishDate?.toISOString() ?? null,
    client: d.client
      ? {
          id: d.client.id,
          name: d.client.name,
          brandColor: d.client.brandColor,
        }
      : null,
    assignee: d.assignee ? { name: d.assignee.name } : null,
    sector: d.sector ? { name: d.sector.name } : null,
  }));

  return <AgencyCalendar demands={payload} />;
}
