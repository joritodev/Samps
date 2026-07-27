import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  LayoutDashboard,
  UserRoundSearch,
} from "lucide-react";
import { DemandStatus, WorkSector } from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

const CLOSED_STATUSES: DemandStatus[] = [
  DemandStatus.DONE,
  DemandStatus.PUBLISHED,
  DemandStatus.CANCELLED,
];

/** Capacidade planejada (MVP) — substitui por config real depois. */
const SECTOR_CAPACITY: Record<WorkSector, number> = {
  SOCIAL: 12,
  DESIGN: 10,
  VIDEO: 8,
  TRAFFIC: 6,
};

const SECTOR_LABEL: Record<WorkSector, string> = {
  SOCIAL: "Social Media",
  DESIGN: "Design",
  VIDEO: "Vídeo",
  TRAFFIC: "Tráfego",
};

const SECTOR_ORDER: WorkSector[] = [
  WorkSector.SOCIAL,
  WorkSector.DESIGN,
  WorkSector.VIDEO,
];

function formatTodayLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function capacityRatio(inProduction: number, capacity: number) {
  if (capacity <= 0) return 0;
  return Math.min(inProduction / capacity, 1.5);
}

function capacityTone(inProduction: number, capacity: number) {
  const ratio = capacityRatio(inProduction, capacity);
  if (ratio > 1) return "text-red-600";
  if (ratio >= 0.85) return "text-amber-600";
  return "text-emerald-600";
}

function sectorLabel(sector: WorkSector | null) {
  if (!sector) return "Sem setor";
  return SECTOR_LABEL[sector];
}

export default async function PainelGestaoPage() {
  const todayLabel = formatTodayLabel(new Date());
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const now = new Date();

  let demandasEmAberto = 0;
  let concluidasNaSemana = 0;
  let demandasAtrasadas = 0;
  let demandasSemResponsavel = 0;
  let sectors = SECTOR_ORDER.map((sector) => ({
    id: sector,
    name: SECTOR_LABEL[sector],
    inProduction: 0,
    capacity: SECTOR_CAPACITY[sector],
  }));
  let criticalDemands: {
    id: string;
    title: string;
    sector: WorkSector | null;
  }[] = [];

  try {
    const [
      openCount,
      completedWeekCount,
      overdueCount,
      unassignedCount,
      operacaoPorSetor,
      criticas,
    ] = await Promise.all([
      db.demand.count({
        where: { status: { notIn: CLOSED_STATUSES } },
      }),
      db.demand.count({
        where: {
          status: {
            in: [DemandStatus.DONE, DemandStatus.PUBLISHED],
          },
          updatedAt: { gte: weekAgo },
        },
      }),
      db.demand.count({
        where: {
          status: { notIn: CLOSED_STATUSES },
          deadline: { lt: now },
        },
      }),
      db.demand.count({
        where: { assigneeId: null },
      }),
      db.demand.groupBy({
        by: ["sector"],
        where: {
          status: DemandStatus.IN_PRODUCTION,
          sector: { not: null },
        },
        _count: { _all: true },
      }),
      db.demand.findMany({
        where: { status: { notIn: CLOSED_STATUSES } },
        orderBy: { createdAt: "asc" },
        take: 5,
        select: {
          id: true,
          title: true,
          sector: true,
        },
      }),
    ]);

    demandasEmAberto = openCount;
    concluidasNaSemana = completedWeekCount;
    demandasAtrasadas = overdueCount;
    demandasSemResponsavel = unassignedCount;
    criticalDemands = criticas;

    const productionBySector = new Map(
      operacaoPorSetor
        .filter((row) => row.sector !== null)
        .map((row) => [row.sector as WorkSector, row._count._all])
    );

    sectors = SECTOR_ORDER.map((sector) => ({
      id: sector,
      name: SECTOR_LABEL[sector],
      inProduction: productionBySector.get(sector) ?? 0,
      capacity: SECTOR_CAPACITY[sector],
    }));
  } catch (error) {
    console.error("painel-gestao queries", error);
  }

  const kpiCards = [
    {
      id: "open",
      label: "Demandas em aberto",
      value: demandasEmAberto,
      icon: FolderOpen,
      iconClass: "text-muted-foreground",
    },
    {
      id: "done",
      label: "Concluídas na semana",
      value: concluidasNaSemana,
      icon: CheckCircle2,
      iconClass: "text-emerald-600",
    },
    {
      id: "overdue",
      label: "Demandas atrasadas",
      value: demandasAtrasadas,
      icon: AlertCircle,
      iconClass: "text-red-600",
    },
    {
      id: "unassigned",
      label: "Sem responsável",
      value: demandasSemResponsavel,
      icon: UserRoundSearch,
      iconClass: "text-muted-foreground",
    },
  ] as const;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-card">
      <header className="shrink-0 border-b border-border bg-card">
        <div className="flex items-center justify-between gap-4 px-6 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
              <LayoutDashboard className="h-4 w-4 text-foreground/80" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Painel da Gestão
              </h1>
              <p className="mt-0.5 text-sm capitalize text-muted-foreground">
                {todayLabel}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/demandas">Quadro interno</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 bg-background p-6">
        <section className="space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Indicadores principais
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpiCards.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {kpi.label}
                    </CardTitle>
                    <Icon className={cn("h-4 w-4", kpi.iconClass)} />
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold tracking-tight text-foreground">
                      {kpi.value}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold tracking-tight text-foreground">
                Operação por Setor
              </CardTitle>
              <CardDescription>
                Carga em produção versus capacidade planejada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sectors.map((sector) => {
                const ratio = Math.min(
                  capacityRatio(sector.inProduction, sector.capacity),
                  1
                );
                const overloaded = sector.inProduction > sector.capacity;

                return (
                  <div
                    key={sector.id}
                    className="rounded-lg border border-border px-4 py-3.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">
                        {sector.name}
                      </p>
                      <p
                        className={cn(
                          "text-xs font-medium",
                          capacityTone(sector.inProduction, sector.capacity)
                        )}
                      >
                        {sector.inProduction} em produção · cap.{" "}
                        {sector.capacity}
                        {overloaded ? " · acima" : ""}
                      </p>
                    </div>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          overloaded ? "bg-red-500/80" : "bg-muted-foreground/50"
                        )}
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold tracking-tight text-foreground">
                Demandas Críticas / Atrasadas
              </CardTitle>
              <CardDescription>
                Itens mais antigos ainda em aberto
              </CardDescription>
            </CardHeader>
            <CardContent>
              {criticalDemands.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhuma demanda crítica no momento.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {criticalDemands.map((demand) => (
                    <li
                      key={demand.id}
                      className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {demand.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {sectorLabel(demand.sector)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
