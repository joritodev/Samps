import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  Users,
  Kanban,
  FolderKanban,
  Camera,
  Timer,
} from "lucide-react";
import { requireAuth } from "@/lib/permissions/check";
import { getManagementOverview } from "@/lib/services/management.service";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DemandCard } from "@/components/shared/demand-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sectorColors = [
  "bg-primary",
  "bg-violet-500",
  "bg-blue-500",
  "bg-amber-500",
  "bg-teal-light",
  "bg-rose-500",
];

export default async function GestaoPage() {
  const user = await requireAuth();
  const overview = await getManagementOverview(user);
  const { kpis, sectorStats, priorityDemands } = overview;

  const maxOpen = Math.max(...sectorStats.map((s) => s.openCount), 1);

  const shortcuts = [
    { href: "/quadros/social-media", label: "Quadro Social", icon: Kanban },
    { href: "/quadros/design", label: "Quadro Design", icon: Kanban },
    { href: "/quadros/video", label: "Quadro Vídeo", icon: Kanban },
    { href: "/quadros/trafego", label: "Quadro Tráfego", icon: Kanban },
    { href: "/projetos", label: "Projetos", icon: FolderKanban },
    { href: "/captacoes", label: "Captações", icon: Camera },
    { href: "/clientes", label: "Clientes", icon: Users },
    { href: "/clientes/quadro/criar", label: "Criar quadro", icon: Kanban },
  ];

  const alerts = [
    kpis.overdue > 0 && `${kpis.overdue} demandas atrasadas`,
    kpis.unassigned > 0 && `${kpis.unassigned} demandas sem responsável`,
    kpis.inProduction > 0 && `${kpis.inProduction} em produção`,
    kpis.activeTimers > 0 && `${kpis.activeTimers} cronômetros ativos`,
    kpis.inReview > 0 && `${kpis.inReview} aguardando revisão`,
    kpis.adjustments > 0 && `${kpis.adjustments} em ajuste`,
  ].filter(Boolean);

  return (
    <div>
      <PageHeader
        title="Painel da Gestão"
        description="Visão consolidada da operação da agência."
        action={
          <Button asChild>
            <Link href="/clientes/quadro/criar">Criar quadro de cliente</Link>
          </Button>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Em aberto"
          value={kpis.open}
          icon={Kanban}
          accent="primary"
          description="Demandas ativas"
        />
        <StatCard
          title="Atrasadas"
          value={kpis.overdue}
          icon={AlertTriangle}
          accent="destructive"
          description="Requer atenção"
        />
        <StatCard
          title="Concluídas hoje"
          value={kpis.doneToday}
          icon={Clock}
          accent="muted"
        />
        <StatCard
          title="Em produção"
          value={kpis.inProduction}
          icon={Timer}
          accent="teal"
          description={`${kpis.activeTimers} cronômetros`}
        />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="font-display text-xl">Carga por setor</CardTitle>
            <p className="text-xs text-muted-foreground">Demandas abertas por equipe</p>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            {sectorStats.map((s, i) => {
              const pct = Math.round((s.openCount / maxOpen) * 100);
              return (
                <Link
                  key={s.id}
                  href={
                    s.slug === "social-media"
                      ? "/quadros/social-media"
                      : s.slug === "trafego"
                        ? "/quadros/trafego"
                        : `/quadros/${s.slug === "video" ? "video" : "design"}`
                  }
                  className="block space-y-2"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold tracking-wide text-foreground">
                      {s.name}
                    </span>
                    <span className="text-muted-foreground">{s.openCount} abertas</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn("h-full rounded-full", sectorColors[i % sectorColors.length])}
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="font-display text-xl">Alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-6">
            {alerts.length ? (
              alerts.map((alert, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {alert}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum alerta no momento.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="font-display text-xl">Prioridades gerais</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          {priorityDemands.length ? (
            priorityDemands.map((d) => (
              <DemandCard key={d.id} demand={d} showOrigin />
            ))
          ) : (
            <p className="col-span-full text-sm text-muted-foreground">
              Nenhuma prioridade aberta.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="font-display text-xl">Atalhos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 pt-6 md:grid-cols-4">
          {shortcuts.map((s) => (
            <Button key={s.href} variant="outline" className="justify-start" asChild>
              <Link href={s.href}>
                <s.icon className="mr-2 h-4 w-4" />
                {s.label}
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
