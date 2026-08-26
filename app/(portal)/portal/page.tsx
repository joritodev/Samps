import { requireAuth } from "@/lib/permissions/check";
import { getPortalOverview } from "@/lib/services/portal.service";
import { PortalHome } from "@/components/portal/portal-home";

export default async function PortalOverviewPage() {
  const user = await requireAuth();
  const overview = await getPortalOverview(user);

  if (!overview) {
    return <p className="text-sm text-muted-foreground">Portal indisponível.</p>;
  }

  return (
    <PortalHome
      clientName={overview.client.name}
      stats={overview.stats}
      demands={overview.demands}
    />
  );
}
