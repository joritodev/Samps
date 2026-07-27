import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireAuth } from "@/lib/permissions/check";
import { listDemands } from "@/lib/services/demands.service";
import { getPortalClientId } from "@/lib/services/portal.service";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function PortalMateriaisPage() {
  const user = await requireAuth();
  const clientId = await getPortalClientId(user);
  if (!clientId) {
    return <p className="text-sm text-slate-500">Portal indisponível.</p>;
  }

  const demands = await listDemands(user, { context: "portal", clientId });
  const completed = demands.filter((d) => d.status === "DONE" || d.deliveryDate);

  return (
    <div>
      <PageHeader title="Materiais concluídos" description="Conteúdos entregues e finalizados" />
      <div className="space-y-2">
        {completed.length ? (
          completed.map((demand) => (
            <Card key={demand.id} className="rounded-xl shadow-sm">
              <CardContent className="flex items-center justify-between py-4 text-sm">
                <div>
                  <p className="font-medium">{demand.title}</p>
                  <p className="text-xs text-slate-500">{demand.type}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">{demand.status}</Badge>
                  {demand.deliveryDate && (
                    <Badge variant="outline">
                      {format(new Date(demand.deliveryDate), "dd/MM/yyyy", { locale: ptBR })}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="rounded-xl shadow-sm">
            <CardContent className="py-12 text-center text-sm text-slate-500">
              Nenhum material concluído.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
