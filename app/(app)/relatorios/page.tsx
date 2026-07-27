import { requireAuth } from "@/lib/permissions/check";
import { getIndicators } from "@/lib/services/indicators.service";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function RelatoriosPage() {
  const user = await requireAuth();
  const isMgmt = user.userType === "ADMIN" || user.userType === "MANAGEMENT";
  const scope = {
    userId: isMgmt ? undefined : user.id,
    sectorId: isMgmt ? undefined : user.sectorId ?? undefined,
  };

  const [month, week, today] = await Promise.all([
    getIndicators({ period: "month", ...scope }),
    getIndicators({ period: "week", ...scope }),
    getIndicators({ period: "today", ...scope }),
  ]);

  function hours(seconds: number) {
    return `${(seconds / 3600).toFixed(1)}h`;
  }

  return (
    <div>
      <PageHeader
        title="Relatórios e indicadores"
        description="Produtividade por período (agregação provisória)."
      />

      <div className="space-y-8">
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="font-display text-xl">Hoje</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Concluídas" value={today.completed} accent="primary" />
            <StatCard title="Em produção" value={today.inProgress} accent="teal" />
            <StatCard title="Atrasadas" value={today.overdue} accent="destructive" />
            <StatCard
              title="Tempo trabalhado"
              value={hours(today.totalWorkedSeconds)}
              accent="muted"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="font-display text-xl">Semana</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Concluídas" value={week.completed} accent="primary" />
            <StatCard title="Sessões" value={week.sessionsCount} accent="teal" />
            <StatCard title="Ajustes" value={week.adjustments} accent="destructive" />
            <StatCard
              title="Tempo médio/sessão"
              value={hours(week.avgSessionSeconds)}
              accent="muted"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="font-display text-xl">Mês</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Concluídas" value={month.completed} accent="primary" />
            <StatCard title="Sessões" value={month.sessionsCount} accent="teal" />
            <StatCard
              title="Tempo total"
              value={hours(month.totalWorkedSeconds)}
              accent="muted"
            />
            <StatCard
              title="Atrasadas (atuais)"
              value={month.overdue}
              accent="destructive"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
