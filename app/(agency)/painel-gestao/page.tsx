import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CornerDownLeft,
  Kanban,
  Plus,
} from "lucide-react";
import { requireAuth } from "@/lib/permissions/check";
import { canSeeManagementDashboard } from "@/lib/permissions/resolve";
import { getDashboardPath } from "@/types/auth";
import { getManagementOverview } from "@/lib/services/management.service";
import { assigneeHref, demandFilterHref } from "@/lib/agency/demand-filters";
import { DemandCard } from "@/components/shared/demand-card";
import { MetricCard } from "@/components/agency/metric-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, userInitials } from "@/lib/utils";

/** Cor de reserva quando o setor não tem cor própria cadastrada. */
const sectorFallbackColors = ["bg-chart-1", "bg-chart-2", "bg-chart-4", "bg-chart-3"];

function sectorHref(slug: string) {
  if (slug === "social-media" || slug === "social") return "/setores/social";
  if (slug === "trafego") return "/setores/trafego";
  if (slug === "video") return "/setores/video";
  if (slug === "design") return "/setores/design";
  return "/setores";
}

const shortcuts = [
  { href: "/setores/social", label: "Social" },
  { href: "/setores/design", label: "Design" },
  { href: "/setores/video", label: "Vídeo" },
  { href: "/setores/trafego", label: "Tráfego" },
];

const cardTitle =
  "font-display text-[15px] font-semibold leading-none tracking-[-0.01em] text-card-foreground";

export default async function PainelGestaoPage() {
  const user = await requireAuth();
  if (!canSeeManagementDashboard(user.userType)) {
    redirect(getDashboardPath(user.userType));
  }
  const {
    kpis,
    flow,
    adjustments,
    sectorStats,
    noSectorCount,
    peopleLoad,
    needsYou,
    generatedAt,
  } = await getManagementOverview(user);

  const maxOpen = Math.max(...sectorStats.map((s) => s.openCount), noSectorCount, 1);
  const maxPerson = Math.max(...peopleLoad.map((p) => p.openCount), 1);
  const peopleBySector = peopleLoad.reduce<Record<string, typeof peopleLoad>>(
    (acc, p) => {
      (acc[p.sectorName] ??= []).push(p);
      return acc;
    },
    {}
  );
  const samePriority =
    needsYou.length > 1 &&
    needsYou.every((n) => n.demand.priority?.name === needsYou[0].demand.priority?.name);
  const allClear = kpis.overdue === 0 && kpis.unassigned === 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto p-1 sm:p-2">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">Painel da Gestão</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Operação às {format(generatedAt, "HH:mm", { locale: ptBR })} de{" "}
            {format(generatedAt, "d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav
            aria-label="Quadros dos setores"
            className="flex flex-wrap items-center gap-0.5 rounded-lg border border-border/80 bg-card p-0.5 shadow-xs"
          >
            {shortcuts.map((s) => (
              <Button key={s.href} variant="ghost" size="sm" className="h-7 px-2" asChild>
                <Link href={s.href}>
                  <Kanban className="h-3.5 w-3.5" />
                  {s.label}
                </Link>
              </Button>
            ))}
          </nav>
          <Button size="sm" variant="outline" asChild>
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
          hint="Abertas com prazo vencido agora"
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
          hint="Prazos estourados registrados no mês, inclusive os já resolvidos. Detalhe em Performance"
          className="col-span-2 sm:col-span-1"
        />
      </Card>

      {/* O ciclo da demanda. Ajuste é retorno da Revisão, não etapa. */}
      <section aria-labelledby="fluxo-titulo" className="mt-3 shrink-0">
        <h2 id="fluxo-titulo" className="sr-only">
          Fluxo das demandas em aberto
        </h2>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-0 sm:rounded-xl sm:border sm:border-border/80 sm:bg-card sm:p-1 sm:shadow-sm">
          {flow.map((stage, i) => (
            <li key={stage.key} className="relative flex items-stretch">
              <div className="flex w-full flex-col rounded-lg border border-border/80 bg-card shadow-xs sm:border-0 sm:bg-transparent sm:shadow-none">
                <Link
                  href={demandFilterHref(stage.key)}
                  className="group flex-1 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="block truncate text-xs font-medium text-muted-foreground group-hover:text-foreground">
                    {stage.label}
                  </span>
                  <span className="num mt-0.5 block text-xl font-semibold leading-none text-foreground">
                    {stage.count}
                    <span className="sr-only"> demandas</span>
                  </span>
                </Link>
                {stage.key === "revisao" && adjustments > 0 ? (
                  <Link
                    href={demandFilterHref("ajustes")}
                    className="mx-1.5 mb-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-warning transition-colors hover:bg-warning/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <CornerDownLeft className="size-3.5" aria-hidden />
                    {adjustments} {adjustments === 1 ? "voltou" : "voltaram"} para ajuste
                  </Link>
                ) : null}
              </div>
              {i < flow.length - 1 ? (
                <ChevronRight
                  aria-hidden
                  className="pointer-events-none absolute -right-2 top-4 z-10 hidden size-4 text-muted-foreground/50 sm:block"
                />
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-3 grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-12">
        {/* Onde agir primeiro: no celular vem antes das cargas. */}
        <section
          aria-labelledby="precisa-titulo"
          className="order-1 flex flex-col lg:order-2 lg:col-span-8 lg:min-h-0"
        >
          <div className="flex shrink-0 items-center justify-between px-1 pb-2.5">
            <h2 id="precisa-titulo" className={cardTitle}>
              Precisa de você
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
            {allClear && needsYou.every((n) => n.reason === "priority") ? (
              <div className="mb-2.5 flex items-center gap-3 rounded-xl border border-success/25 bg-success/10 px-4 py-3 text-sm text-foreground">
                <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
                <span>
                  <strong className="font-semibold">Tudo em dia.</strong> Nada atrasado e
                  nenhuma demanda sem responsável.
                </span>
              </div>
            ) : null}
            {needsYou.length ? (
              <div className="grid gap-2.5 px-px sm:grid-cols-2 xl:grid-cols-3">
                {needsYou.map(({ demand, reason, reasonLabel }) => (
                  <DemandCard
                    key={demand.id}
                    demand={demand}
                    showOrigin
                    titleAs="h3"
                    hidePriority={samePriority}
                    href={`/demandas?abrir=${demand.id}`}
                    reason={{
                      label: reasonLabel,
                      tone:
                        reason === "overdue"
                          ? "danger"
                          : reason === "priority"
                            ? "neutral"
                            : "warning",
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhuma demanda em andamento. Novas demandas aparecem aqui quando pedirem ação.
              </p>
            )}
          </div>
        </section>

        <div className="order-2 flex flex-col gap-3 lg:order-1 lg:col-span-4 lg:min-h-0">
          <Card className="flex flex-col lg:min-h-0 lg:flex-1">
            <CardHeader className="shrink-0 flex-row items-center justify-between space-y-0 px-4 py-3.5">
              <h2 className={cardTitle}>Carga por pessoa</h2>
              <span className="text-xs text-muted-foreground">demandas em aberto</span>
            </CardHeader>
            <CardContent className="px-2 pb-2 pt-0 lg:min-h-0 lg:overflow-y-auto">
              {peopleLoad.length ? (
                <div className="space-y-3">
                  {Object.entries(peopleBySector).map(([sectorName, people]) => (
                    <div key={sectorName}>
                      <h3 className="px-2 pb-1 text-xs font-medium text-muted-foreground">
                        {sectorName}
                      </h3>
                      <ul className="space-y-0.5">
                        {people.map((person) => (
                          <li key={person.id}>
                            <Link
                              href={assigneeHref(person.id)}
                              className="group flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <span
                                aria-hidden
                                className="relative grid size-7 shrink-0 place-items-center rounded-full bg-foreground/[0.08] text-xs font-semibold text-foreground"
                              >
                                {userInitials(person.name)}
                                {person.producingNow ? (
                                  <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-success" />
                                ) : null}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-foreground group-hover:underline">
                                  {person.name}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {person.producingNow
                                    ? "Produzindo agora"
                                    : person.openCount === 0
                                      ? "Livre"
                                      : null}
                                  {person.overdueCount > 0 ? (
                                    <span className="font-medium text-destructive">
                                      {person.producingNow ? " · " : ""}
                                      {person.overdueCount}{" "}
                                      {person.overdueCount === 1 ? "atrasada" : "atrasadas"}
                                    </span>
                                  ) : null}
                                </span>
                              </span>
                              <span className="flex w-16 shrink-0 items-center gap-2">
                                <span className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/[0.06]">
                                  <span
                                    className="block h-full rounded-full bg-cyan"
                                    style={{
                                      width: `${Math.round((person.openCount / maxPerson) * 100)}%`,
                                    }}
                                  />
                                </span>
                                <span className="num w-5 text-right text-sm font-semibold text-foreground">
                                  {person.openCount}
                                </span>
                              </span>
                              <span className="sr-only">demandas em aberto</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-2 pb-2 text-sm text-muted-foreground">
                  Nenhuma pessoa de produção ativa. Convide a equipe em Equipe.
                </p>
              )}
            </CardContent>
          </Card>

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
                          width: `${pct}%`,
                          ...(s.color ? { backgroundColor: s.color } : {}),
                        }}
                      />
                    </div>
                  </Link>
                );
              })}
              {noSectorCount > 0 ? (
                <p className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Sem setor definido</span>
                  <span className="num font-semibold">{noSectorCount}</span>
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
