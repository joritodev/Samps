import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireAuth } from "@/lib/permissions/check";
import { listDemands } from "@/lib/services/demands.service";
import { getPortalClientId } from "@/lib/services/portal.service";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function PortalCalendarioPage() {
  const user = await requireAuth();
  const clientId = await getPortalClientId(user);
  if (!clientId) {
    return <p className="text-sm text-slate-500">Portal indisponível.</p>;
  }

  const demands = await listDemands(user, { context: "portal", clientId });
  const withDates = demands.filter(
    (d) => d.deliveryDate || d.publishDate
  );

  return (
    <div>
      <PageHeader title="Calendário" description="Entregas e publicações previstas" />
      <div className="space-y-2">
        {withDates.length ? (
          withDates.map((demand) => (
            <Card key={demand.id} className="rounded-xl shadow-sm">
              <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4 text-sm">
                <span className="font-medium">{demand.title}</span>
                <div className="flex gap-2">
                  {demand.deliveryDate && (
                    <Badge variant="secondary">
                      Entrega: {format(new Date(demand.deliveryDate), "dd/MM", { locale: ptBR })}
                    </Badge>
                  )}
                  {demand.publishDate && (
                    <Badge variant="outline">
                      Publicação: {format(new Date(demand.publishDate), "dd/MM", { locale: ptBR })}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="rounded-xl shadow-sm">
            <CardContent className="py-12 text-center text-sm text-slate-500">
              Nenhum evento no calendário.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
