import { AgendaView } from "@/components/agency/agenda-view";
import { requireAuth } from "@/lib/permissions/check";

export default async function AgendaPage() {
  await requireAuth();
  return <AgendaView />;
}
