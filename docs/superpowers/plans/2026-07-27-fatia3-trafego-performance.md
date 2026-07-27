# Fatia 3 Núcleo (Tráfego + Performance) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar `/meu-painel/trafego`, navegação/seed do usuário de tráfego e `/performance` com indicadores reais via `getIndicators`.

**Architecture:** Reutilizar `SectorBoardView` + `getSectorBoardData("trafego")` para o painel individual; transformar `PerformanceDashboard` em componente alimentado por props tipadas a partir de três chamadas a `getIndicators` na server page.

**Tech Stack:** Next.js 14 App Router, Prisma, `StatCard`, tokens Tailwind shadcn (`bg-card`, etc.)

**Spec:** [`docs/superpowers/specs/2026-07-27-fatia3-trafego-performance-design.md`](../specs/2026-07-27-fatia3-trafego-performance-design.md)

## Global Constraints

- Não inventar métricas (SLA %, taxa de conclusão) sem fonte no banco
- Não alterar redirect pós-login de `OTHER` (`/setores/trafego`)
- Manter layout compacto dos painéis (`overflow-hidden`, full-height)
- Commits só se o usuário pedir explicitamente
- Verificação: `npx tsc --noEmit` (sem erros novos)

---

## File map

| File | Responsibility |
|------|----------------|
| Create: `app/(agency)/meu-painel/trafego/page.tsx` | Painel individual tráfego |
| Modify: `components/agency/agency-sidebar.tsx` | `panelNavForUser` → OTHER |
| Modify: `prisma/seed.ts` | Nome Rafael Alves |
| Rewrite: `components/agency/performance-dashboard.tsx` | UI por props, sem mock |
| Modify: `app/(agency)/performance/page.tsx` | Fetch `getIndicators` + passar props |

---

### Task 1: Página Meu painel — Tráfego

**Files:**
- Create: `app/(agency)/meu-painel/trafego/page.tsx`
- Reference: `app/(agency)/meu-painel/video/page.tsx`

**Interfaces:**
- Consumes: `getSectorBoardData(slug, { assigneeId })`, `listSectorUsers`, `SectorBoardView`, `requireAuth`, `hasPermission`
- Produces: rota `/meu-painel/trafego` renderizando quadro filtrado por executor

- [ ] **Step 1: Criar a página**

```tsx
import { requireAuth } from "@/lib/permissions/check";
import { hasPermission } from "@/lib/permissions/resolve";
import {
  getSectorBoardData,
  listSectorUsers,
} from "@/lib/services/sector-board.service";
import { SectorBoardView } from "@/components/sector/sector-board-view";

export default async function TrafegoPanelPage() {
  const user = await requireAuth();
  const data = await getSectorBoardData("trafego", { assigneeId: user.id });
  const sectorUsers = await listSectorUsers(data.sector.id);
  const canAssign =
    hasPermission(user.permissions, "demands.assign") ||
    data.sector.leaderId === user.id;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-4 sm:p-6">
      <SectorBoardView
        title="Meu painel — Tráfego"
        description="Demandas atribuídas ou assumidas por você"
        columns={data.columns}
        grouped={data.grouped as never}
        top5={data.top5 as never}
        kpis={data.kpis}
        calendarDemands={data.calendarDemands as never}
        currentUserId={user.id}
        canAssign={canAssign}
        sectorUsers={sectorUsers}
      />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck da rota**

Run: `npx tsc --noEmit 2>&1 | Select-String -Pattern "meu-painel/trafego|error TS" | Select-Object -First 20`

Expected: sem erros apontando para o arquivo novo

---

### Task 2: Sidebar + seed Rafael Alves

**Files:**
- Modify: `components/agency/agency-sidebar.tsx` (`panelNavForUser`)
- Modify: `prisma/seed.ts` (createUser tráfego)

**Interfaces:**
- Consumes: `userType === "OTHER"`
- Produces: link Meu Painel → `/meu-painel/trafego`; seed name `Rafael Alves`

- [ ] **Step 1: Atualizar `panelNavForUser`**

Localizar o `switch` em `panelNavForUser` e incluir antes do `default`:

```ts
    case "OTHER":
      return [{ href: "/meu-painel/trafego", label: "Meu Painel", icon: ListTodo }];
```

- [ ] **Step 2: Renomear no seed**

Em `prisma/seed.ts`, no `createUser` de `trafego@samps.digital`:

```ts
  const colaborador = await createUser({
    name: "Rafael Alves",
    email: "trafego@samps.digital",
    userType: UserType.OTHER,
    sectorId: trafego.id,
    jobTitle: "Gestor de tráfego",
  });
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | Select-String -Pattern "error TS" | Select-Object -First 15`

Expected: sem erros novos

- [ ] **Step 4 (opcional, ambiente local): reseed**

Run: `npm run db:seed`

Expected: log lista `trafego@samps.digital`; nome Rafael Alves no banco

---

### Task 3: PerformanceDashboard com props reais

**Files:**
- Rewrite: `components/agency/performance-dashboard.tsx`
- Modify: `app/(agency)/performance/page.tsx`

**Interfaces:**
- Consumes: return type de `getIndicators` (period, completed, overdue, inProgress, adjustments, sessionsCount, totalWorkedSeconds, avgSessionSeconds)
- Produces: `PerformanceDashboard({ today, week, month })` sem constantes mock

- [ ] **Step 1: Reescrever o dashboard**

Substituir o conteúdo de `components/agency/performance-dashboard.tsx` por:

```tsx
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type IndicatorSnapshot = {
  period: string;
  completed: number;
  overdue: number;
  inProgress: number;
  adjustments: number;
  sessionsCount: number;
  totalWorkedSeconds: number;
  avgSessionSeconds: number;
};

function hours(seconds: number) {
  return `${(seconds / 3600).toFixed(1)}h`;
}

function PeriodBlock({
  title,
  data,
}: {
  title: string;
  data: IndicatorSnapshot;
}) {
  return (
    <Card>
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-lg font-semibold tracking-tight">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Concluídas" value={data.completed} accent="primary" />
        <StatCard title="Em produção" value={data.inProgress} accent="teal" />
        <StatCard title="Atrasadas" value={data.overdue} accent="destructive" />
        <StatCard title="Ajustes" value={data.adjustments} accent="destructive" />
        <StatCard title="Sessões" value={data.sessionsCount} accent="muted" />
        <StatCard
          title="Tempo trabalhado"
          value={hours(data.totalWorkedSeconds)}
          accent="muted"
        />
        <StatCard
          title="Tempo médio/sessão"
          value={hours(data.avgSessionSeconds)}
          accent="muted"
        />
      </CardContent>
    </Card>
  );
}

export function PerformanceDashboard({
  today,
  week,
  month,
}: {
  today: IndicatorSnapshot;
  week: IndicatorSnapshot;
  month: IndicatorSnapshot;
}) {
  return (
    <div className="h-full min-h-0 space-y-6 overflow-y-auto p-4 sm:p-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Performance
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Indicadores de produtividade por período
        </p>
      </header>
      <PeriodBlock title="Hoje" data={today} />
      <PeriodBlock title="Semana" data={week} />
      <PeriodBlock title="Mês" data={month} />
    </div>
  );
}
```

- [ ] **Step 2: Ligar a page server**

Substituir `app/(agency)/performance/page.tsx` por:

```tsx
import { PerformanceDashboard } from "@/components/agency/performance-dashboard";
import { requirePermission } from "@/lib/permissions/check";
import { getIndicators } from "@/lib/services/indicators.service";

export default async function PerformancePage() {
  const user = await requirePermission("productivity.view");
  const isMgmt = user.userType === "ADMIN" || user.userType === "MANAGEMENT";
  const scope = {
    userId: isMgmt ? undefined : user.id,
    sectorId: isMgmt ? undefined : user.sectorId ?? undefined,
  };

  const [today, week, month] = await Promise.all([
    getIndicators({ period: "today", ...scope }),
    getIndicators({ period: "week", ...scope }),
    getIndicators({ period: "month", ...scope }),
  ]);

  return <PerformanceDashboard today={today} week={week} month={month} />;
}
```

- [ ] **Step 3: Typecheck final**

Run: `npx tsc --noEmit 2>&1 | Select-String -Pattern "error TS" | Select-Object -First 25; echo "---done---"`

Expected: nenhum erro em `performance-dashboard`, `performance/page`, `meu-painel/trafego`

---

### Task 4: Aceite manual (checklist)

- [ ] **Step 1:** Login `trafego@samps.digital` / `Samps@2026` → land em `/setores/trafego`
- [ ] **Step 2:** Sidebar **Meu Painel** → `/meu-painel/trafego`
- [ ] **Step 3:** Login `gestao@samps.digital` → `/performance` sem KPIs mock (87%, 3,4 dias)
- [ ] **Step 4:** Confirmar que gráficos Recharts mock sumiram

---

## Spec coverage (self-review)

| Spec item | Task |
|-----------|------|
| `/meu-painel/trafego` | Task 1 |
| Sidebar OTHER | Task 2 |
| Seed Rafael Alves | Task 2 |
| Performance via getIndicators | Task 3 |
| Sem SLA/% inventados | Task 3 (só métricas do service) |
| Aceite login/navegação | Task 4 |
| tsc limpo | Tasks 1–3 |
| Agenda / dark global | Fora (não no plano) |
