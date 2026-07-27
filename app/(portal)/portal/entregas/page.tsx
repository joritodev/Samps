import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireAuth } from "@/lib/permissions/check";
import { listDemands } from "@/lib/services/demands.service";
import { getPortalClientId } from "@/lib/services/portal.service";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function PortalEntregasPage() {
  const user = await requireAuth();
  const clientId = await getPortalClientId(user);
  if (!clientId) {
    return <p className="text-sm text-slate-500">Portal indisponível.</p>;
  }

  const demands = await listDemands(user, { context: "portal", clientId });
  const upcoming = demands
    .filter((d) => d.deliveryDate && new Date(d.deliveryDate) >= new Date())
    .sort((a, b) => new Date(a.deliveryDate!).getTime() - new Date(b.deliveryDate!).getTime());

  return (
    <div>
      <PageHeader title="Próximas entregas" description="Materiais com entrega programada" />
      <div className="space-y-2">
        {upcoming.length ? (
          upcoming.map((demand) => (
            <Card key={demand.id} className="rounded-xl shadow-sm">
              <CardContent className="flex items-center justify-between py-4 text-sm">
                <div>
                  <p className="font-medium">{demand.title}</p>
                  <p className="text-xs text-slate-500">{demand.type}</p>
                </div>
                <Badge>
                  {format(new Date(demand.deliveryDate!), "dd/MM/yyyy", { locale: ptBR })}
                </Badge>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="rounded-xl shadow-sm">
            <CardContent className="py-12 text-center text-sm text-slate-500">
              Nenhuma entrega programada.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
