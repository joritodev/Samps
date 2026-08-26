import { Clock, Package, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PortalPage } from "./portal-page";
import { PortalStat } from "./portal-stat";

export function PortalHome({
  clientName,
  stats,
  demands,
}: {
  clientName: string;
  stats: { planned: number; inProgress: number; published: number };
  demands: Array<{
    id: string;
    title: string;
    status: string;
    externalStatus: string | null;
  }>;
}) {
  const recent = demands.slice(0, 10);

  return (
    <PortalPage
      title={`Olá, ${clientName}`}
      description="Visão geral do seu conteúdo"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <PortalStat label="Planejadas" value={stats.planned} icon={Clock} />
        <PortalStat
          label="Em produção"
          value={stats.inProgress}
          icon={Package}
        />
        <PortalStat label="Publicadas" value={stats.published} icon={Send} />
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-base font-semibold text-foreground">
          Conteúdos recentes
        </h2>
        {recent.length ? (
          <ul className="space-y-2">
            {recent.map((demand) => (
              <li
                key={demand.id}
                className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm"
              >
                <span className="min-w-0 font-medium text-foreground">
                  {demand.title}
                </span>
                <Badge variant="outline" className="shrink-0">
                  {demand.externalStatus ?? demand.status}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <div>
            <p className="font-medium text-foreground">Nenhum conteúdo recente</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Os conteúdos visíveis para você aparecem aqui quando forem
              publicados.
            </p>
          </div>
        )}
      </section>
    </PortalPage>
  );
}
