import { requireAuth } from "@/lib/permissions/check";
import { listDemands } from "@/lib/services/demands.service";
import { getPortalClientId } from "@/lib/services/portal.service";
import { PortalEntregas } from "@/components/portal/portal-subpages";

export default async function PortalEntregasPage() {
  const user = await requireAuth();
  const clientId = await getPortalClientId(user);
  if (!clientId) {
    return <p className="text-sm text-muted-foreground">Portal indisponível.</p>;
  }

  const demands = await listDemands(user, { context: "portal", clientId });
  const upcoming = demands
    .filter((d) => d.deliveryDate && new Date(d.deliveryDate) >= new Date())
    .sort((a, b) => new Date(a.deliveryDate!).getTime() - new Date(b.deliveryDate!).getTime());

  return <PortalEntregas demands={upcoming} />;
}
