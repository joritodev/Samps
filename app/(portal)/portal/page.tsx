import { requireAuth } from "@/lib/permissions/check";
import { getPortalOverview } from "@/lib/services/portal.service";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Package, Send, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PortalOverviewPage() {
  const user = await requireAuth();
  const overview = await getPortalOverview(user);

  if (!overview) {
    return <p className="text-sm text-slate-500">Portal indisponível.</p>;
  }

  const { client, stats, demands, isPreview } = overview;

  return (
    <div>
      {isPreview && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Simulação — portal em rascunho. Apenas usuários internos podem visualizar.
        </div>
      )}
      <PageHeader
        title={`Olá, ${client.name}`}
        description="Visão geral do seu conteúdo"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Planejadas" value={stats.planned} icon={Clock} />
        <StatCard title="Em produção" value={stats.inProgress} icon={Package} />
        <StatCard title="Entregues" value={stats.delivered} icon={CheckCircle} />
        <StatCard title="Publicadas" value={stats.published} icon={Send} />
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Conteúdos recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {demands.length ? (
            demands.slice(0, 10).map((demand) => (
              <div
                key={demand.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm"
              >
                <span className="font-medium">{demand.title}</span>
                <Badge variant="outline">{demand.status}</Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">Nenhum conteúdo disponível.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
