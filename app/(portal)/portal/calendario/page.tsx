import { requireAuth } from "@/lib/permissions/check";
import { listDemands } from "@/lib/services/demands.service";
import { getPortalClientId } from "@/lib/services/portal.service";
import { PortalCalendario } from "@/components/portal/portal-subpages";

export default async function PortalCalendarioPage() {
  const user = await requireAuth();
  const clientId = await getPortalClientId(user);
  if (!clientId) {
    return <p className="text-sm text-muted-foreground">Portal indisponível.</p>;
  }

  const demands = await listDemands(user, { context: "portal", clientId });
  const withDates = demands.filter((d) => d.deliveryDate || d.publishDate);

  return <PortalCalendario demands={withDates} />;
}
