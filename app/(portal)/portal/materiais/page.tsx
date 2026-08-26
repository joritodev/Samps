import { requireAuth } from "@/lib/permissions/check";
import { listDemands } from "@/lib/services/demands.service";
import { getPortalClientId } from "@/lib/services/portal.service";
import { PortalMateriais } from "@/components/portal/portal-subpages";

export default async function PortalMateriaisPage() {
  const user = await requireAuth();
  const clientId = await getPortalClientId(user);
  if (!clientId) {
    return <p className="text-sm text-muted-foreground">Portal indisponível.</p>;
  }

  const demands = await listDemands(user, { context: "portal", clientId });
  const completed = demands.filter((d) => d.status === "DONE" || d.deliveryDate);

  return <PortalMateriais demands={completed} />;
}
