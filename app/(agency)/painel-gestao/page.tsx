import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  FolderKanban,
  Kanban,
  Plus,
  Users,
} from "lucide-react";
import { requireAuth } from "@/lib/permissions/check";
import { canSeeManagementDashboard } from "@/lib/permissions/resolve";
import { getDashboardPath } from "@/types/auth";
import { getManagementOverview } from "@/lib/services/management.service";
import { DemandCard } from "@/components/shared/demand-card";
import { MetricCard } from "@/components/agency/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sectorColors = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
];

function sectorHref(slug: string) {
  if (slug === "social-media" || slug === "social") return "/setores/social";
  if (slug === "trafego") return "/setores/trafego";
  if (slug === "video") return "/setores/video";
  return "/setores/design";
}

export default async function PainelGestaoPage() {
  const user = await requireAuth();
  if (!canSeeManagementDashboard(user.userType)) {
    redirect(getDashboardPath(user.userType));
  }
  const overview = await getManagementOverview(user);
  const { kpis, sectorStats, priorityDemands } = overview;

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
    { count: kpis.overdue, label: "atrasadas", tone: "danger" },
    { count: kpis.unassigned, label: "sem responsável", tone: "warning" },
    { count: kpis.inReview, label: "em revisão", tone: "neutral" },
    { count: kpis.adjustments, label: "em ajuste", tone: "warning" },
    {
      count: kpis.awaitingPublication,
      label: "aguardando publicação",
      tone: "neutral",
    },
    { count: kpis.activeTimers, label: "cronômetros ativos", tone: "neutral" },
  ].filter((a) => a.count > 0);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-1 sm:p-2">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Central de gestão</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            Painel da Gestão
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Visão consolidada da operação
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav
            aria-label="Atalhos"
            className="flex flex-wrap items-center gap-0.5 rounded-lg border border-border/80 bg-card p-0.5 shadow-xs"
          >
            {shortcuts.map((s) => (
              <Button
                key={s.href}
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                asChild
              >
                <Link href={s.href}>
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </Link>
              </Button>
            ))}
          </nav>
          <Button size="sm" asChild>
            <Link href="/clientes/quadro/criar">
              <Plus className="h-3.5 w-3.5" />
              Criar quadro
            </Link>
          </Button>
        </div>
      </header>

      {/* Faixa única de KPIs: hairlines via gap-px sobre fundo de borda. */}
      <Card className="mt-4 grid shrink-0 grid-cols-3 gap-px overflow-hidden bg-border/70 xl:grid-cols-9 [&>*]:bg-card">
        <MetricCard variant="plain" label="Em aberto" value={kpis.open} tone="primary" />
        <MetricCard variant="plain" label="Atrasadas" value={kpis.overdue} tone="danger" />
        <MetricCard variant="plain" label="Atrasos/mês" value={kpis.delaysThisMonth} tone="danger" />
        <MetricCard variant="plain" label="Hoje" value={kpis.doneToday} />
        <MetricCard variant="plain" label="Produção" value={kpis.inProduction} tone="success" />
        <MetricCard variant="plain" label="Revisão" value={kpis.inReview} tone="success" />
        <MetricCard variant="plain" label="Ajustes" value={kpis.adjustments} tone="warning" />
        <MetricCard variant="plain" label="Publicação" value={kpis.awaitingPublication} tone="primary" />
        <MetricCard variant="plain" label="Sem resp." value={kpis.unassigned} />
      </Card>

      <div className="mt-3 grid min-h-0 flex-1 gap-3 lg:grid-cols-12">
        <div className="flex min-h-0 flex-col gap-3 lg:col-span-4">
          <Card className="shrink-0">
            <CardHeader className="flex-row items-center justify-between space-y-0 px-4 py-3.5">
              <CardTitle>Carga por setor</CardTitle>
              <span className="text-xs text-muted-foreground">em aberto</span>
            </CardHeader>
            <CardContent className="space-y-3.5 px-4 pb-4 pt-0">
              {sectorStats.map((s, i) => {
                const pct = Math.round((s.openCount / maxOpen) * 100);
                return (
                  <Link
                    key={s.id}
                    href={sectorHref(s.slug)}
                    className="group block space-y-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground group-hover:underline group-hover:underline-offset-4">
                        {s.name}
                      </span>
                      <span className="num text-sm font-semibold text-foreground">
                        {s.openCount}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
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

          <Card className="flex min-h-0 flex-1 flex-col">
            <CardHeader className="shrink-0 flex-row items-center justify-between space-y-0 px-4 py-3.5">
              <CardTitle>Alertas</CardTitle>
              {alerts.length ? (
                <Badge variant="warning">{alerts.length}</Badge>
              ) : null}
            </CardHeader>
            <CardContent className="min-h-0 overflow-y-auto px-2 pb-2 pt-0">
              {alerts.length ? (
                <ul className="space-y-0.5">
                  {alerts.map((alert) => (
                    <li
                      key={alert.label}
                      className="flex items-center gap-3 rounded-md px-2 py-2 text-sm"
                    >
                      <span
                        className={cn(
                          "grid size-7 shrink-0 place-items-center rounded-md",
                          alert.tone === "danger" &&
                            "bg-destructive/10 text-destructive",
                          alert.tone === "warning" && "bg-warning/10 text-warning",
                          alert.tone === "neutral" &&
                            "bg-foreground/[0.05] text-muted-foreground"
                        )}
                      >
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 text-muted-foreground">
                        <span className="num mr-1 font-semibold text-foreground">
                          {alert.count}
                        </span>
                        {alert.label}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-2 pb-2 text-sm text-muted-foreground">
                  Nenhum alerta no momento.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="flex min-h-0 flex-col lg:col-span-8">
          <CardHeader className="shrink-0 flex-row items-center justify-between space-y-0 px-4 py-3.5">
            <CardTitle>Prioridades gerais</CardTitle>
            <Link
              href="/demandas"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Ver quadro geral →
            </Link>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-0">
            {priorityDemands.length ? (
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
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
