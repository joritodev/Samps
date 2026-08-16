# Fatia 3.1 — Relatórios em /performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Pré-requisitos:** fatia 3.0 mergeada (#28). PR #29 (colunas 4.1) é **paralela** — não bloqueia 3.1; mergear quando CI ok, sem misturar no mesmo PR.

**Goal:** Em `/performance`, gestão responde desempenho por pessoa e por ContentType no período; colaborador só vê o próprio.

**Architecture:** Math pura e testada em `lib/agency/performance-math.ts`. `getPerformanceReport` em `lib/services/performance.service.ts` monta duas tabelas a partir de demandas com `productionCompletedAt` no intervalo + `WorkSession` COMPLETED. A página lê filtros na URL; o dashboard ganha abas Resumo | Por pessoa | Por tipo e CSV da aba ativa.

**Tech Stack:** Next.js 14 App Router, Prisma, Vitest, shadcn Tabs/Select, CSV montado no cliente (`Blob` + `URL.createObjectURL`) — sem lib nova.

**Spec:** `docs/superpowers/specs/2026-08-16-fase3-gestao-agencia-design.md` (§2 decisões + §6 aceite)

## Global Constraints

- Entrega = `productionCompletedAt` no intervalo (nunca `updatedAt` + DONE).
- No prazo: só entra no denominador quem tem `dueDate`; `onTime = productionCompletedAt <= dueDate`.
- Retrabalho: count de `WorkSession` com `stage = ADJUSTMENT` e `status = COMPLETED` com `endedAt` no período, ligadas às demandas do relatório (via `demandId`), agregadas por `userId` da sessão (não snapshot `DemandStatus.ADJUSTMENTS`).
- Tempo real: soma `WorkSession.totalActiveSeconds` com `status = COMPLETED` das demandas entregues no período, agrupada por `contentTypeId` da demanda (e por usuário na aba pessoa).
- Gestão (`userType` ADMIN ou MANAGEMENT): filtros livres (`sectorId`, `clientId`, período). Demais: forçar `assigneeId = user.id` (ignorar `userId` da query).
- Sempre mostrar `n`; se `n < 3` UI mostra texto “Amostra pequena”.
- `contentTypeId` null → nome `"Sem tipo"`.
- Permissão: `productivity.view` (já usada em [`app/(agency)/performance/page.tsx`](app/(agency)/performance/page.tsx)).
- Não criar rota em `(app)/relatorios`. Feature só em `(agency)`.
- Shell canônico: `app/(agency)`.

## File map

| Arquivo | Responsabilidade |
|---------|------------------|
| `lib/agency/performance-math.ts` | mean / median / stdDev / onTimeRate / SMALL_SAMPLE_N |
| `lib/agency/performance-math.test.ts` | Vitest dos helpers |
| `lib/agency/performance-period.ts` | parse presets + `from`/`to` ISO → Date range (fim do dia inclusivo) |
| `lib/agency/performance-period.test.ts` | Vitest do parse |
| `lib/services/performance.service.ts` | `getPerformanceReport` |
| `app/(agency)/performance/page.tsx` | auth, scope, searchParams, carregar indicators + report |
| `components/agency/performance-dashboard.tsx` | abas, tabelas, aviso n, CSV |
| `components/agency/performance-filters.tsx` | presets + de–até + setor/cliente (só gestão) |

## Estado atual (não reinventar)

- Página: `requirePermission("productivity.view")` + `getIndicators` today/week/month.
- UI: [`components/agency/performance-dashboard.tsx`](components/agency/performance-dashboard.tsx) — strip de períodos, sem abas/CSV.
- Entrega em indicators já usa `productionCompletedAt` (3.0).
- Sem padrão CSV no repo — criar helper local no dashboard.

---

### Task 1: Math pura (TDD)

**Files:**
- Create: `lib/agency/performance-math.ts`
- Create: `lib/agency/performance-math.test.ts`

**Interfaces:**
- Produces:
  - `export const SMALL_SAMPLE_N = 3`
  - `mean(values: number[]): number | null`
  - `median(values: number[]): number | null`
  - `stdDev(values: number[]): number | null` — amostral (÷ n−1); `null` se `n < 2`
  - `onTimeRate(onTime: number, withDueDate: number): number | null` — `null` se denominador 0

- [ ] **Step 1: Branch**

```bash
git checkout master
git pull --ff-only
git checkout -b feat/relatorios-performance
```

- [ ] **Step 2: Write failing tests**

```ts
// lib/agency/performance-math.test.ts
import { describe, expect, it } from "vitest";
import { mean, median, onTimeRate, stdDev } from "./performance-math";

describe("performance-math", () => {
  it("mean returns null for empty", () => {
    expect(mean([])).toBeNull();
  });
  it("mean averages", () => {
    expect(mean([2, 4, 6])).toBe(4);
  });
  it("median odd and even", () => {
    expect(median([1, 3, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it("stdDev sample of known set", () => {
    // population known: std sample of [2,4,4,4,5,5,7,9] ≈ 2.138
    const s = stdDev([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(s).not.toBeNull();
    expect(s!).toBeCloseTo(2.138, 2);
  });
  it("stdDev null when n < 2", () => {
    expect(stdDev([1])).toBeNull();
  });
  it("onTimeRate", () => {
    expect(onTimeRate(3, 4)).toBe(0.75);
    expect(onTimeRate(0, 0)).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
npx vitest run lib/agency/performance-math.test.ts
```

Expected: FAIL (módulo inexistente)

- [ ] **Step 4: Implement**

```ts
// lib/agency/performance-math.ts
export const SMALL_SAMPLE_N = 3;

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  if (s.length % 2 === 1) return s[mid]!;
  return (s[mid - 1]! + s[mid]!) / 2;
}

export function stdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const m = mean(values)!;
  const variance =
    values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function onTimeRate(onTime: number, withDueDate: number): number | null {
  if (withDueDate === 0) return null;
  return onTime / withDueDate;
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx vitest run lib/agency/performance-math.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add lib/agency/performance-math.ts lib/agency/performance-math.test.ts
git commit -m "test(performance): math de media mediana desvio e prazo"
```

---

### Task 2: Período (presets + de–até)

**Files:**
- Create: `lib/agency/performance-period.ts`
- Create: `lib/agency/performance-period.test.ts`

**Interfaces:**
- Produces:
  - `type PerformancePreset = "today" | "week" | "month" | "custom"`
  - `resolvePerformanceRange(input: { preset?: string; from?: string; to?: string; now?: Date }): { from: Date; to: Date; preset: PerformancePreset }`
  - `from` = início do dia local 00:00:00; `to` = fim do dia 23:59:59.999
  - Default sem params: preset `month` = primeiro dia do mês corrente → hoje (fim do dia)
  - `week` = hoje − 6 dias 00:00 → hoje fim
  - `today` = hoje 00:00 → hoje fim
  - Se `from` e `to` ISO (`YYYY-MM-DD`) válidos → `custom` (ignorar preset)
  - Se só um de from/to → fallback `month`

- [ ] **Step 1: Testes**

Cobrir: default mês; today; week; custom from/to; from inválido cai no mês.

- [ ] **Step 2: Implementar + PASS + commit**

```bash
git commit -m "feat(performance): resolver periodo de filtros da URL"
```

---

### Task 3: Service `getPerformanceReport`

**Files:**
- Create: `lib/services/performance.service.ts`
- Create: `lib/services/performance.service.test.ts` — preferir testes com helpers puros extraídos se DB for pesado; no mínimo testar agregação pura de uma função `buildPerformanceReport(rows)` se extrair. Se não houver harness de DB, testar só funções de agregação exportadas do mesmo arquivo.

**Interfaces:**
- Consumes: `mean`, `median`, `stdDev`, `onTimeRate` de `performance-math`
- Produces:

```ts
export type ContentTypeStats = {
  contentTypeId: string | null;
  name: string;
  n: number;
  volume: number; // igual a n nesta fatia
  avgSeconds: number | null;
  medianSeconds: number | null;
  stdDevSeconds: number | null;
};

export type UserRow = {
  userId: string;
  name: string;
  deliveries: number;
  onTime: number;
  withDueDate: number;
  onTimeRate: number | null;
  reworkSessions: number;
  avgSecondsByType: {
    contentTypeId: string | null;
    name: string;
    avgSeconds: number | null;
    n: number;
  }[];
};

export type PerformanceReport = {
  from: string; // ISO date YYYY-MM-DD
  to: string;
  byUser: UserRow[];
  byContentType: ContentTypeStats[];
};

export async function getPerformanceReport(params: {
  from: Date;
  to: Date;
  /** Força recorte a um assignee (colaborador). */
  assigneeId?: string;
  sectorId?: string;
  clientId?: string;
}): Promise<PerformanceReport>
```

**Query (Prisma):**

1. `db.demand.findMany` where:
   - `productionCompletedAt: { gte: from, lte: to }`
   - optional `assigneeId`, `sectorId`, `clientId`
   - `include`: `assignee: { select: { id, name } }`, `contentType: { select: { id, name } }`, `workSessions: { where: { status: COMPLETED }, select: { userId, stage, totalActiveSeconds, endedAt } }`

2. Para cada demanda entregue:
   - conta delivery no `assigneeId` (se null, pular da aba pessoa ou bucket “Sem responsável” — **decisão travada:** pular linhas sem assignee na aba pessoa; ainda entram em por tipo)
   - onTime se `dueDate` e `productionCompletedAt <= dueDate`
   - segundos: sessions COMPLETED com `endedAt` no intervalo (ou todas COMPLETED da demanda se `endedAt` null — preferir `endedAt` no range; se `endedAt` null usar `startedAt` no range só se necessário; **simplificar:** somar sessions COMPLETED cujo `endedAt` está no range OU (`endedAt` null e `startedAt` no range))

3. Retrabalho por usuário: count sessions com `stage === ADJUSTMENT` e `endedAt` no range (userId da session), restritas a `demandId` ∈ set das demandas filtradas **ou** qualquer session do usuário no range — **travado:** só sessions ligadas às demandas do relatório (mesmo client/sector filter via demanda).

4. Ordenar `byUser` por `deliveries` desc; `byContentType` por `n` desc.

- [ ] **Step 1: Implementar service + testes de agregação**

- [ ] **Step 2:** `npx tsc --noEmit` limpo

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(performance): relatorio por pessoa e por content type"
```

---

### Task 4: Página + filtros + abas + CSV

**Files:**
- Modify: `app/(agency)/performance/page.tsx`
- Modify: `components/agency/performance-dashboard.tsx`
- Create: `components/agency/performance-filters.tsx`

**Interfaces:**
- Consumes: `getIndicators`, `getPerformanceReport`, `resolvePerformanceRange`
- Page `searchParams`: `preset?`, `from?`, `to?`, `sectorId?`, `clientId?`

**Comportamento da page:**

```ts
const user = await requirePermission("productivity.view");
const isMgmt = user.userType === "ADMIN" || user.userType === "MANAGEMENT";
const range = resolvePerformanceRange({
  preset: searchParams.preset,
  from: searchParams.from,
  to: searchParams.to,
});
const report = await getPerformanceReport({
  from: range.from,
  to: range.to,
  assigneeId: isMgmt ? undefined : user.id,
  sectorId: isMgmt ? searchParams.sectorId : user.sectorId ?? undefined,
  clientId: isMgmt ? searchParams.clientId : undefined,
});
// Manter today/week/month indicators para aba Resumo (scope igual ao atual)
```

**Dashboard:**
- Tabs: `Resumo` | `Por pessoa` | `Por tipo`
- Resumo = UI atual dos snapshots
- Por pessoa: tabela colunas Entregas | No prazo % | Retrabalho (sessões) | Tempo médio por tipo (texto compacto ou sublinhas); badge “Amostra pequena” se `deliveries < SMALL_SAMPLE_N`
- Por tipo: tabela Tipo | n | Média | Mediana | Desvio; barras CSS simples (`width %` relativo ao max n); aviso n<3
- Botão “Exportar CSV”: gera CSV da aba ativa; filename `performance-{tab}-{from}-{to}.csv`; MIME `text/csv;charset=utf-8`
- Filtros: component client que faz `router.push` com query string; gestão vê Select setor/cliente (carregar listas na page e passar como props — `db.sector.findMany` + clientes via serviço já usado em clientes)

- [ ] **Step 1: Wire page + filters**

- [ ] **Step 2: Abas + tabelas + CSV**

- [ ] **Step 3: Smoke manual**

1. Gestão: filtrar mês corrente → ver ≥0 linhas; CSV abre.
2. Colaborador: só a própria linha (ou vazio); sem selects de org.
3. Confirmar que `/demandas` e quadro cliente não mudaram.

- [ ] **Step 4: Gates + commit**

```bash
npx tsc --noEmit
npm test
npm run lint
npm run build
git commit -m "feat(performance): abas por pessoa e tipo com csv"
```

---

### Task 5: PR e review

- [ ] **Step 1: Push + PR**

```bash
git push -u origin HEAD
gh pr create --title "feat(performance): relatorios por pessoa e content type" --body "## Summary
- Relatório em /performance: abas Resumo / Por pessoa / Por tipo
- Entrega = productionCompletedAt; CSV da aba ativa
- Gestão vê org; colaborador só a própria linha

## Test plan
- [ ] Gestão filtra período e vê n por usuário/tipo
- [ ] Colaborador não vê outros
- [ ] CSV da aba ativa
- [ ] Aviso amostra pequena quando n < 3
"
```

- [ ] **Step 2: Bugbot** no PR

- [ ] **Step 3: Merge** só com CI verify verde

---

## Spec coverage checklist

| Aceite / decisão | Task |
|------------------|------|
| Entrega = productionCompletedAt | 3 |
| % no prazo derivado dueDate | 3 |
| Retrabalho via WorkSession ADJUSTMENT | 3 |
| Tempo médio por ContentType | 3 |
| Gestão org / colaborador próprio | 4 |
| Presets + de–até | 2, 4 |
| Expandir /performance | 4 |
| n + aviso n<3 | 4 |
| Sem tipo | 3 |
| Tabela + barras + CSV | 4 |
| productivity.view | 4 |
| Não tocar (app)/relatorios | 4 |

## Fora desta fatia

- Unificar permissões indicators/productivity/reports
- Publicação como KPI
- Anexos / menções / CSP / vídeo / visibilidade / pontuação
- Capacidade 8h (depende deste relatório + histórico)
