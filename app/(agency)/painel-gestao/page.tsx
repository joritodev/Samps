import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ChevronRight, Kanban, Plus } from "lucide-react";
import { requireAuth } from "@/lib/permissions/check";
import { canSeeManagementDashboard } from "@/lib/permissions/resolve";
import { getDashboardPath } from "@/types/auth";
import { getManagementOverview } from "@/lib/services/management.service";
import { demandFilterHref } from "@/lib/agency/demand-filters";
import { DemandCard } from "@/components/shared/demand-card";
import { MetricCard } from "@/components/agency/metric-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, userInitials } from "@/lib/utils";

/** Cor de reserva quando o setor não tem cor própria cadastrada. */
const sectorFallbackColors = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-4",
  "bg-chart-3",
];

function sectorHref(slug: string) {
  if (slug === "social-media" || slug === "social") return "/setores/social";
  if (slug === "trafego") return "/setores/trafego";
  if (slug === "video") return "/setores/video";
  return "/setores/design";
}

const shortcuts = [
  { href: "/setores/social", label: "Social" },
  { href: "/setores/design", label: "Design" },
  { href: "/setores/video", label: "Vídeo" },
  { href: "/setores/trafego", label: "Tráfego" },
];

const cardTitle = "font-display text-[15px] font-semibold leading-none tracking-[-0.01em] text-card-foreground";

export default async function PainelGestaoPage() {
  const user = await requireAuth();
  if (!canSeeManagementDashboard(user.userType)) {
    redirect(getDashboardPath(user.userType));
  }
  const overview = await getManagementOverview(user);
  const { kpis, sectorStats, priorityDemands, flow, peopleLoad } = overview;

  const maxOpen = Math.max(...sectorStats.map((s) => s.openCount), 1);
  const maxPerson = Math.max(...peopleLoad.map((p) => p.openCount), 1);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto p-1 sm:p-2">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">
            Painel da Gestão
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Visão consolidada da operação
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav
            aria-label="Quadros dos setores"
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
                  <Kanban className="h-3.5 w-3.5" />
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

      {/* Contagens de decisão: cada número leva à lista que ele conta. */}
      <Card className="mt-4 grid shrink-0 grid-cols-2 gap-px overflow-hidden bg-border/70 sm:grid-cols-3 lg:grid-cols-5 [&>*]:bg-card">
        <MetricCard variant="plain" label="Em aberto" value={kpis.open} href="/demandas" />
        <MetricCard
          variant="plain"
          label="Atrasadas"
          value={kpis.overdue}
          tone={kpis.overdue > 0 ? "danger" : "default"}
          href={demandFilterHref("atrasadas")}
        />
        <MetricCard
          variant="plain"
          label="Sem responsável"
          value={kpis.unassigned}
          tone={kpis.unassigned > 0 ? "warning" : "default"}
          href={demandFilterHref("sem-responsavel")}
        />
        <MetricCard
          variant="plain"
          label="Concluídas hoje"
          value={kpis.doneToday}
          href={demandFilterHref("concluidas-hoje")}
        />
        <MetricCard
          variant="plain"
          label="Atrasos no mês"
          value={kpis.delaysThisMonth}
          tone={kpis.delaysThisMonth > 0 ? "danger" : "default"}
          href="/performance"
          className="col-span-2 sm:col-span-1"
        />
      </Card>

      {/* O ciclo da demanda, na ordem em que o trabalho anda. */}
      <section aria-labelledby="fluxo-titulo" className="mt-3 shrink-0">
        <h2 id="fluxo-titulo" className="sr-only">
          Fluxo das demandas em aberto
        </h2>
        <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-0 sm:rounded-xl sm:border sm:border-border/80 sm:bg-card sm:p-1 sm:shadow-sm">
          {flow.map((stage, i) => (
            <li key={stage.key} className="relative flex items-center">
              <Link
                href={demandFilterHref(stage.key)}
                className="group flex w-full items-center justify-between gap-2 rounded-lg border border-border/80 bg-card px-3 py-2.5 shadow-xs transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:border-0 sm:bg-transparent sm:shadow-none"
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-muted-foreground group-hover:text-foreground">
                    {stage.label}
                  </span>
                  <span
                    className={cn(
                      "num mt-0.5 block text-xl font-semibold leading-none",
                      stage.key === "ajustes" && stage.count > 0
                        ? "text-warning"
                        : "text-foreground"
                    )}
                  >
                    {stage.count}
                  </span>
                </span>
              </Link>
              {i < flow.length - 1 ? (
                <ChevronRight
                  aria-hidden
                  className="pointer-events-none absolute -right-2 z-10 hidden size-4 text-muted-foreground/50 sm:block"
                />
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-3 grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-12">
        <div className="flex flex-col gap-3 lg:col-span-4 lg:min-h-0">
          <Card className="shrink-0">
            <CardHeader className="flex-row items-center justify-between space-y-0 px-4 py-3.5">
              <h2 className={cardTitle}>Carga por setor</h2>
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
                      <span className="font-medium text-foreground group-hover:underline">
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
                          !s.color && sectorFallbackColors[i % sectorFallbackColors.length]
                        )}
                        style={{
                          width: `${Math.max(pct, 4)}%`,
                          ...(s.color ? { backgroundColor: s.color } : {}),
                        }}
                      />
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          <Card className="flex flex-col lg:min-h-0 lg:flex-1">
            <CardHeader className="shrink-0 flex-row items-center justify-between space-y-0 px-4 py-3.5">
              <h2 className={cardTitle}>Carga por pessoa</h2>
              <span className="text-xs text-muted-foreground">em aberto · atrasadas</span>
            </CardHeader>
            <CardContent className="px-2 pb-2 pt-0 lg:min-h-0 lg:overflow-y-auto">
              {peopleLoad.length ? (
                <ul className="space-y-0.5">
                  {peopleLoad.map((person) => (
                    <li
                      key={person.id}
                      className="flex items-center gap-3 rounded-md px-2 py-1.5"
                    >
                      <span
                        aria-hidden
                        className="grid size-7 shrink-0 place-items-center rounded-full bg-foreground/[0.08] text-xs font-semibold text-foreground"
                      >
                        {userInitials(person.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {person.name}
                        </span>
                        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-foreground/[0.06]">
                          <span
                            className="block h-full rounded-full bg-cyan"
                            style={{
                              width: `${Math.max(Math.round((person.openCount / maxPerson) * 100), 4)}%`,
                            }}
                          />
                        </span>
                      </span>
                      <span
                        className="shrink-0 text-right text-xs text-muted-foreground"
                        aria-label={`${person.openCount} em aberto, ${person.overdueCount} atrasadas`}
                      >
                        <span className="num text-sm font-semibold text-foreground">
                          {person.openCount}
                        </span>
                        {person.overdueCount > 0 ? (
                          <span className="num ml-1.5 font-semibold text-destructive">
                            {person.overdueCount}
                          </span>
                        ) : (
                          <span className="num ml-1.5">0</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-2 pb-2 text-sm text-muted-foreground">
                  Nenhuma demanda atribuída em aberto.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Prioridades sem moldura externa: os cards já são as unidades. */}
        <section
          aria-labelledby="prioridades-titulo"
          className="flex flex-col lg:col-span-8 lg:min-h-0"
        >
          <div className="flex shrink-0 items-center justify-between px-1 pb-2.5">
            <h2 id="prioridades-titulo" className={cardTitle}>
              Prioridades gerais
            </h2>
            <Link
              href="/demandas"
              className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Ver quadro geral
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-1">
            {priorityDemands.length ? (
              <div className="grid gap-2.5 px-px sm:grid-cols-2 xl:grid-cols-3">
                {priorityDemands.slice(0, 6).map((d) => (
                  <DemandCard
                    key={d.id}
                    demand={d}
                    showOrigin
                    titleAs="h3"
                    href={`/demandas?abrir=${d.id}`}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhuma prioridade aberta. As demandas de maior prioridade aparecem aqui.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
