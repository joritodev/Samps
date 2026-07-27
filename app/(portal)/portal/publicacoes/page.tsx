import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireAuth } from "@/lib/permissions/check";
import { listDemands } from "@/lib/services/demands.service";
import { getPortalClientId } from "@/lib/services/portal.service";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function PortalPublicacoesPage() {
  const user = await requireAuth();
  const clientId = await getPortalClientId(user);
  if (!clientId) {
    return <p className="text-sm text-slate-500">Portal indisponível.</p>;
  }

  const demands = await listDemands(user, { context: "portal", clientId });
  const upcoming = demands
    .filter((d) => d.publishDate && new Date(d.publishDate) >= new Date())
    .sort((a, b) => new Date(a.publishDate!).getTime() - new Date(b.publishDate!).getTime());

  return (
    <div>
      <PageHeader title="Próximas publicações" description="Conteúdos com data de publicação" />
      <div className="space-y-2">
        {upcoming.length ? (
          upcoming.map((demand) => (
            <Card key={demand.id} className="rounded-xl shadow-sm">
              <CardContent className="flex items-center justify-between py-4 text-sm">
                <div>
                  <p className="font-medium">{demand.title}</p>
                  <p className="text-xs text-slate-500">{demand.format ?? demand.type}</p>
                </div>
                <Badge>
                  {format(new Date(demand.publishDate!), "dd/MM/yyyy", { locale: ptBR })}
                </Badge>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="rounded-xl shadow-sm">
            <CardContent className="py-12 text-center text-sm text-slate-500">
              Nenhuma publicação programada.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
