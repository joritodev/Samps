import Link from "next/link";
import {
  AlertTriangle,
  Camera,
  FolderKanban,
  Kanban,
  Users,
} from "lucide-react";
import { requireAuth } from "@/lib/permissions/check";
import { getManagementOverview } from "@/lib/services/management.service";
import { DemandCard } from "@/components/shared/demand-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sectorColors = [
  "bg-primary",
  "bg-violet-500",
  "bg-blue-500",
  "bg-amber-500",
  "bg-teal-500",
  "bg-rose-500",
];

function sectorHref(slug: string) {
  if (slug === "social-media" || slug === "social") return "/setores/social";
  if (slug === "trafego") return "/setores/trafego";
  if (slug === "video") return "/setores/video";
  return "/setores/design";
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "danger" | "teal" | "primary";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card px-3 py-2.5",
        tone === "default" && "border-border",
        tone === "danger" &&
          "border-destructive/40 dark:border-destructive/35 dark:bg-destructive/10",
        tone === "teal" &&
          "border-emerald-500/35 bg-emerald-500/5 dark:border-emerald-400/30 dark:bg-emerald-400/10",
        tone === "primary" &&
          "border-primary/35 bg-primary/5 dark:border-primary/40 dark:bg-primary/10"
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-foreground",
          tone === "danger" && "text-destructive",
          tone === "primary" && "text-primary",
          tone === "teal" && "text-emerald-700 dark:text-emerald-300"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default async function PainelGestaoPage() {
  const user = await requireAuth();
  const overview = await getManagementOverview(user);
  const { kpis, sectorStats, priorityDemands, recentDelays } = overview;

  const maxOpen = Math.max(...sectorStats.map((s) => s.openCount), 1);

  const shortcuts = [
    { href: "/setores/social", label: "Social", icon: Kanban },
    { href: "/setores/design", label: "Design", icon: Kanban },
    { href: "/setores/video", label: "Vídeo", icon: Kanban },
    { href: "/setores/trafego", label: "Tráfego", icon: Kanban },
    { href: "/projetos", label: "Projetos", icon: FolderKanban },
    { href: "/captacoes", label: "Captações", icon: Camera },
    { href: "/clientes", label: "Clientes", icon: Users },
  ];

  const alerts = [
    kpis.overdue > 0 && `${kpis.overdue} atrasadas`,
    kpis.unassigned > 0 && `${kpis.unassigned} sem responsável`,
    kpis.inReview > 0 && `${kpis.inReview} em revisão`,
    kpis.adjustments > 0 && `${kpis.adjustments} em ajuste`,
    kpis.awaitingPublication > 0 &&
      `${kpis.awaitingPublication} aguardando publicação`,
    kpis.activeTimers > 0 && `${kpis.activeTimers} cronômetros ativos`,
  ].filter(Boolean) as string[];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 sm:p-5">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Painel da Gestão
          </h1>
          <p className="text-sm text-muted-foreground">
            Visão consolidada da operação
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {shortcuts.map((s) => (
            <Button
              key={s.href}
              variant="outline"
              size="sm"
              className="h-8"
              asChild
            >
              <Link href={s.href}>
                <s.icon className="h-3.5 w-3.5" />
                {s.label}
              </Link>
            </Button>
          ))}
          <Button size="sm" className="h-8" asChild>
            <Link href="/clientes/quadro/criar">Criar quadro</Link>
          </Button>
        </div>
      </header>

      <div className="mt-3 grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-9">
        <Metric label="Em aberto" value={kpis.open} tone="primary" />
        <Metric label="Atrasadas" value={kpis.overdue} tone="danger" />
        <Metric label="Atrasos/mês" value={kpis.delaysThisMonth} tone="danger" />
        <Metric label="Hoje" value={kpis.doneToday} />
        <Metric label="Produção" value={kpis.inProduction} tone="teal" />
        <Metric label="Revisão" value={kpis.inReview} tone="teal" />
        <Metric label="Ajustes" value={kpis.adjustments} tone="danger" />
        <Metric label="Publicação" value={kpis.awaitingPublication} tone="primary" />
        <Metric label="Sem resp." value={kpis.unassigned} />
      </div>

      <div className="mt-3 grid min-h-0 flex-1 gap-3 lg:grid-cols-12">
        <div className="flex min-h-0 flex-col gap-3 lg:col-span-4">
          <Card className="shrink-0 shadow-none">
            <CardHeader className="space-y-0 px-4 py-3">
              <CardTitle className="text-sm font-semibold">Carga por setor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4 pt-0">
              {sectorStats.map((s, i) => {
                const pct = Math.round((s.openCount / maxOpen) * 100);
                return (
                  <Link
                    key={s.id}
                    href={sectorHref(s.slug)}
                    className="block space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{s.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {s.openCount}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          sectorColors[i % sectorColors.length]
                        )}
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          <Card className="shrink-0 shadow-none">
            <CardHeader className="space-y-0 px-4 py-3">
              <CardTitle className="text-sm font-semibold">Alertas</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-1.5 px-4 pb-4 pt-0">
              {alerts.length ? (
                alerts.map((alert) => (
                  <div
                    key={alert}
                    className="flex min-w-0 items-center gap-1.5 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-1.5 text-[11px] leading-tight text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200"
                  >
                    <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-300" />
                    <span className="truncate">{alert}</span>
                  </div>
                ))
              ) : (
                <p className="col-span-2 text-sm text-muted-foreground">
                  Nenhum alerta no momento.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="flex min-h-0 flex-1 flex-col shadow-none">
            <CardHeader className="shrink-0 space-y-0 px-4 py-3">
              <CardTitle className="text-sm font-semibold">
                Últimos atrasos
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4 pt-0">
              {recentDelays.length ? (
                recentDelays.map((d) => {
                  const href = d.demand.clientId
                    ? `/clientes/${d.demand.clientId}/quadro`
                    : d.demand.sector?.slug
                      ? `/setores/${d.demand.sector.slug === "social-media" ? "social" : d.demand.sector.slug}`
                      : "#";
                  return (
                    <Link
                      key={d.id}
                      href={href}
                      className="block rounded-md border border-border px-2.5 py-2 text-xs hover:bg-muted/50"
                    >
                      <p className="font-medium text-foreground line-clamp-1">
                        {d.demand.title}
                      </p>
                      <p className="text-muted-foreground">
                        {d.demand.client.name} · {d.daysOverdue} dia
                        {d.daysOverdue === 1 ? "" : "s"}
                        {d.resolvedAt ? " · resolvido" : " · aberto"}
                      </p>
                    </Link>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum atraso registrado.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="flex min-h-0 flex-col shadow-none lg:col-span-8">
          <CardHeader className="shrink-0 space-y-0 px-4 py-3">
            <CardTitle className="text-sm font-semibold">
              Prioridades gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-0">
            {priorityDemands.length ? (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {priorityDemands.slice(0, 6).map((d) => (
                  <DemandCard key={d.id} demand={d} showOrigin />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma prioridade aberta.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
