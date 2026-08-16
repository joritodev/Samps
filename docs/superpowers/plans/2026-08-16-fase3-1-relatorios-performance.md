# Fatia 3.1 — Relatórios em /performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Só executar **depois** da fatia 3.0 mergeada.

**Goal:** Em `/performance`, gestão responde desempenho por pessoa e por ContentType no período; colaborador só vê o próprio.

**Architecture:** Math pura em `lib/agency/performance-math.ts`. Service monta duas tabelas a partir de demandas com `productionCompletedAt` no intervalo + sessões COMPLETED. A página vira client+server: filtros na URL (`from`, `to`, `sectorId`, `clientId`), dashboard ganha abas.

**Tech Stack:** Prisma, Vitest, shadcn Tabs/Select, sem lib de CSV (montar string no cliente).

**Spec:** `docs/superpowers/specs/2026-08-16-fase3-gestao-agencia-design.md`

## Global Constraints

- Entrega = `productionCompletedAt` no intervalo (nunca `updatedAt` + DONE).
- No prazo: só entra no denominador quem tem `dueDate`; `onTime = productionCompletedAt <= dueDate`.
- Retrabalho: count de `WorkSession` com `stage = ADJUSTMENT` no período, por demanda/responsável (não snapshot de status ADJUSTMENTS).
- Tempo real: soma `WorkSession.totalActiveSeconds` COMPLETED das demandas entregues, agrupada por `contentTypeId`.
- Gestão (`ADMIN`/`MANAGEMENT`): filtros livres. Demais: `assigneeId` forçado = `user.id`.
- `n` sempre visível; se `n < 3` a UI mostra “Amostra pequena”.
- `contentTypeId` null → nome `"Sem tipo"`.
- Permissão continua `productivity.view`.
- Não criar rota em `(app)/relatorios`.

---

### Task 1: Math pura (TDD)

**Files:** Create `lib/agency/performance-math.ts`, `lib/agency/performance-math.test.ts`

**Produces:**
- `mean(values: number[]): number | null` — null se length 0
- `median(values: number[]): number | null`
- `stdDev(values: number[]): number | null` — amostral (n-1); null se n < 2
- `onTimeRate(onTime: number, withDueDate: number): number | null` — null se denominador 0; senão onTime/withDueDate
- `SMALL_SAMPLE_N = 3`

Testes: lista ímpar/par na mediana; stdDev de `[2,4,4,4,5,5,7,9]`; rate 3/4 = 0.75; vazia → null.

Commit: `test(performance): math de media mediana desvio e prazo`

---

### Task 2: Service

**Files:** Create `lib/services/performance.service.ts`

**Produces:** `getPerformanceReport(params: { from: Date; to: Date; userId?: string; sectorId?: string; clientId?: string })`

Retorno:

```ts
type ContentTypeStats = {
  contentTypeId: string | null;
  name: string;
  n: number;
  volume: number;
  avgSeconds: number | null;
  medianSeconds: number | null;
  stdDevSeconds: number | null;
};

type UserRow = {
  userId: string;
  name: string;
  deliveries: number;
  onTime: number;
  withDueDate: number;
  onTimeRate: number | null;
  reworkSessions: number;
  avgSecondsByType: { contentTypeId: string | null; name: string; avgSeconds: number | null; n: number }[];
};

{ from: string; to: string; byUser: UserRow[]; byContentType: ContentTypeStats[] }
```

Query: demands com `productionCompletedAt` entre from/to inclusive, include assignee, contentType, dueDate, workSessions (COMPLETED + ADJUSTMENT no período).

Commit: `feat(performance): relatorio por pessoa e por content type`

---

### Task 3: Página, filtros, abas, CSV

**Files:**
- Modify `app/(agency)/performance/page.tsx` — ler `searchParams` `from` `to` `sectorId` `clientId`; presets preenchem ISO date; default mês corrente.
- Modify `components/agency/performance-dashboard.tsx` — abas Resumo (snapshots `getIndicators` já alinhados) | Por pessoa | Por tipo; aviso n<3; botão CSV da aba ativa (`text/csv`, filename `performance-<aba>-<from>-<to>.csv`).
- Gestão: selects de setor e cliente (listas já usadas em outras páginas). Colaborador: selects ocultos.

Commit: `feat(performance): abas por pessoa e tipo com csv`

---

### Task 4: Gates

`tsc`, `npm test`, `lint`, `build`. Bugbot. PR `feat/relatorios-performance`.

Smoke: gestão filtra agosto, vê linha por usuário com n; colaborador não vê os outros; CSV abre no Excel/Sheets.
