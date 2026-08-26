import { requireAuth } from "@/lib/permissions/check";
import { listDemands } from "@/lib/services/demands.service";
import { getPortalClientId } from "@/lib/services/portal.service";
import { PortalPublicacoes } from "@/components/portal/portal-subpages";

export default async function PortalPublicacoesPage() {
  const user = await requireAuth();
  const clientId = await getPortalClientId(user);
  if (!clientId) {
    return <p className="text-sm text-muted-foreground">Portal indisponível.</p>;
  }

  const demands = await listDemands(user, { context: "portal", clientId });
  const upcoming = demands
    .filter((d) => d.publishDate && new Date(d.publishDate) >= new Date())
    .sort((a, b) => new Date(a.publishDate!).getTime() - new Date(b.publishDate!).getTime());

  return <PortalPublicacoes demands={upcoming} />;
}
