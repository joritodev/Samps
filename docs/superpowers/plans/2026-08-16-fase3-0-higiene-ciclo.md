# Fatia 3.0 — Higiene do ciclo da demanda Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o servidor, o board da agency e os cartões de contrato obedecerem as mesmas regras que a UI e o relatório de gestão vão usar.

**Architecture:** Helpers puros em `lib/agency/labels.ts` (já existem) ganham `assertCan*` testáveis. Services de produção, ajuste e publicação chamam o assert antes de escrever. Geração contratual copia `contentTypeId`. `getIndicators` conta entrega por `productionCompletedAt`.

**Tech Stack:** Next.js 14, Prisma, Vitest, TypeScript.

**Spec:** `docs/superpowers/specs/2026-08-16-fase3-gestao-agencia-design.md`

## Global Constraints

- Não afrouxar RLS nem permissões.
- Mensagens de recusa iguais à intenção da UI (português, uma frase).
- Sem migration nova nesta fatia (só preencher FK que já existe).
- Um commit por tarefa; `npx tsc --noEmit` e `npm test` limpos.
- Conventional Commits em português.
- Branch: `fix/ciclo-demanda-higiene` a partir de `master`.
- Não construir UI de relatório nesta fatia (isso é a 3.1).

---

## File map

| Arquivo | Papel |
|---------|--------|
| `lib/agency/labels.ts` | `assertCanCompleteProduction`, `assertCanRequestAdjustment`, `assertCanRegisterPublication` + mensagens |
| `lib/agency/labels.test.ts` | testes dos asserts |
| `lib/services/work-session.service.ts` | recusar concluir produção fora do status |
| `lib/services/adjustment.service.ts` | recusar ajuste fora de `IN_REVIEW` |
| `lib/services/cards.service.ts` | recusar publicação fora dos status de `canRegisterPublication` |
| `lib/services/board.service.ts` | `contentTypeId` em `generateContractualCards` |
| `lib/agency/board-mapper.ts` + `types/board-ui.ts` | `briefingLockedAt` |
| `components/agency/demand-card.tsx` | usar o campo de verdade, sem cast |
| `components/sector/sector-card-sheet.tsx` | mesmos `can*` da ficha da agency |
| `lib/services/indicators.service.ts` | `completed` = `productionCompletedAt` no período |

---

### Task 1: Asserts de transição (TDD)

**Files:**
- Modify: `lib/agency/labels.ts`
- Modify: `lib/agency/labels.test.ts`

**Interfaces:**
- Consumes: `canCompleteProduction`, `canRequestAdjustment`, `canRegisterPublication`
- Produces:
  - `DEMAND_ACTION_DENIED.production` = `"Só é possível concluir produção em demandas em produção ou ajuste."`
  - `DEMAND_ACTION_DENIED.adjustment` = `"Só é possível solicitar ajuste em demandas em revisão."`
  - `DEMAND_ACTION_DENIED.publication` = `"Só é possível registrar publicação em demandas aprovadas, agendadas ou em revisão."`
  - `assertCanCompleteProduction(status: string): void`
  - `assertCanRequestAdjustment(status: string): void`
  - `assertCanRegisterPublication(status: string): void`

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar em `lib/agency/labels.test.ts`:

```ts
import {
  assertCanCompleteProduction,
  assertCanRegisterPublication,
  assertCanRequestAdjustment,
  DEMAND_ACTION_DENIED,
} from "./labels";

describe("assertCan*", () => {
  it("nao lanca quando o status permite", () => {
    expect(() => assertCanCompleteProduction("IN_PRODUCTION")).not.toThrow();
    expect(() => assertCanRequestAdjustment("IN_REVIEW")).not.toThrow();
    expect(() => assertCanRegisterPublication("APPROVED")).not.toThrow();
  });

  it("lanca a mensagem canonica quando o status nao permite", () => {
    expect(() => assertCanCompleteProduction("PLANNING")).toThrow(
      DEMAND_ACTION_DENIED.production
    );
    expect(() => assertCanRequestAdjustment("IN_PRODUCTION")).toThrow(
      DEMAND_ACTION_DENIED.adjustment
    );
    expect(() => assertCanRegisterPublication("PLANNING")).toThrow(
      DEMAND_ACTION_DENIED.publication
    );
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
npx vitest run lib/agency/labels.test.ts
```

Esperado: FAIL — `DEMAND_ACTION_DENIED` / asserts não exportados.

- [ ] **Step 3: Implementar em `lib/agency/labels.ts`**

```ts
export const DEMAND_ACTION_DENIED = {
  production:
    "Só é possível concluir produção em demandas em produção ou ajuste.",
  adjustment: "Só é possível solicitar ajuste em demandas em revisão.",
  publication:
    "Só é possível registrar publicação em demandas aprovadas, agendadas ou em revisão.",
} as const;

export function assertCanCompleteProduction(status: string) {
  if (!canCompleteProduction(status)) {
    throw new Error(DEMAND_ACTION_DENIED.production);
  }
}

export function assertCanRequestAdjustment(status: string) {
  if (!canRequestAdjustment(status)) {
    throw new Error(DEMAND_ACTION_DENIED.adjustment);
  }
}

export function assertCanRegisterPublication(status: string) {
  if (!canRegisterPublication(status)) {
    throw new Error(DEMAND_ACTION_DENIED.publication);
  }
}
```

- [ ] **Step 4: Testes passam**

```bash
npx vitest run lib/agency/labels.test.ts
```

Esperado: PASS.

- [ ] **Step 5: Commit**

```powershell
git add lib/agency/labels.ts lib/agency/labels.test.ts
git commit -m "fix(demandas): asserts de transicao iguais as regras da UI"
```

---

### Task 2: Services recusam status inválido

**Files:**
- Modify: `lib/services/work-session.service.ts`
- Modify: `lib/services/adjustment.service.ts`
- Modify: `lib/services/cards.service.ts` (`registerPublicationAndComplete`)

**Interfaces:**
- Consumes: os três `assertCan*` da Task 1
- Produces: as mesmas funções públicas, agora falhando cedo

- [ ] **Step 1: `completeWorkSession`**

Depois de validar `materialUrl`, carregar o status da demanda e assertir:

```ts
import { assertCanCompleteProduction } from "@/lib/agency/labels";

const demand = await db.demand.findUnique({
  where: { id: demandId },
  select: { status: true },
});
if (!demand) throw new Error("Demanda não encontrada");
assertCanCompleteProduction(demand.status);
```

Se já existir um `findUnique` da demanda mais abaixo, unificar para não consultar duas vezes.

- [ ] **Step 2: `requestAdjustment`**

Logo após `if (!demand) throw`:

```ts
import { assertCanRequestAdjustment } from "@/lib/agency/labels";

assertCanRequestAdjustment(demand.status);
```

- [ ] **Step 3: `registerPublicationAndComplete`**

Antes do `update`:

```ts
import { assertCanRegisterPublication } from "@/lib/agency/labels";

const card = await db.demand.findUnique({
  where: { id: cardId },
  select: { status: true },
});
if (!card) throw new Error("Cartão não encontrado");
assertCanRegisterPublication(card.status);
```

`publicarDemanda` e `registerPublicationAction` já pegam `error.message` — a mensagem canônica chega na UI.

- [ ] **Step 4: Verificar**

```bash
npx tsc --noEmit
npx vitest run lib/agency/labels.test.ts
```

- [ ] **Step 5: Commit**

```powershell
git add lib/services/work-session.service.ts lib/services/adjustment.service.ts lib/services/cards.service.ts
git commit -m "fix(demandas): recusar producao, ajuste e publicacao fora do status"
```

---

### Task 3: ContentType no cartão contratual + briefingLockedAt no board

**Files:**
- Modify: `lib/services/board.service.ts` (`generateContractualCards`)
- Modify: `lib/agency/board-mapper.ts`
- Modify: `types/board-ui.ts`
- Modify: `components/agency/demand-card.tsx` (remover o cast `as { briefingLockedAt }`)

**Interfaces:**
- Consumes: `ContractService.contentTypeId`
- Produces: `Demand.contentTypeId` preenchido na geração; `BoardDemand.briefingLockedAt: string | null`

- [ ] **Step 1: Em `generateContractualCards`, no objeto do `cardData.push`**

Incluir:

```ts
contentTypeId: service.contentTypeId,
```

- [ ] **Step 2: `boardDemandSelect` e tipo**

```ts
briefingLockedAt: true,
```

Em `BoardDemand`:

```ts
briefingLockedAt: string | null;
```

Em `toBoardDemand`:

```ts
briefingLockedAt: demand.briefingLockedAt?.toISOString() ?? null,
```

- [ ] **Step 3: `demand-card.tsx`**

Passar `demand.briefingLockedAt` para `canDemandBriefing` (Date ou ISO). Sem `as`.

- [ ] **Step 4: `tsc` + testes**

```bash
npx tsc --noEmit
npm test
```

- [ ] **Step 5: Commit**

```powershell
git add lib/services/board.service.ts lib/agency/board-mapper.ts types/board-ui.ts components/agency/demand-card.tsx
git commit -m "fix(quadro): copiar contentTypeId e briefingLockedAt nos cartoes"
```

---

### Task 4: Indicadores e sheet do setor

**Files:**
- Modify: `lib/services/indicators.service.ts`
- Modify: `components/sector/sector-card-sheet.tsx`

**Interfaces:**
- Consumes: `productionCompletedAt`; helpers `can*`
- Produces: `completed` = count com `productionCompletedAt: { gte: from }` (e os filtros `userId`/`sectorId` já existentes). Não filtrar mais `status in DONE|PUBLISHED|IN_REVIEW` nem `updatedAt` para esse número.

- [ ] **Step 1: Trocar o count `completed`**

```ts
db.demand.count({
  where: {
    ...where,
    productionCompletedAt: { gte: from },
  },
}),
```

Deixar `overdue` / `inProgress` / `adjustments` como estão (snapshot operacional, não KPI de entrega).

- [ ] **Step 2: Sheet do setor**

Importar `canCompleteProduction`, `canRequestAdjustment`, `canRegisterPublication` de `@/lib/agency/labels` e esconder/desabilitar os mesmos CTAs que `card-detail-sheet.tsx` já esconde. Não inventar status extra.

- [ ] **Step 3: Verificar**

```bash
npx tsc --noEmit
npm test
npm run lint
```

- [ ] **Step 4: Commit**

```powershell
git add lib/services/indicators.service.ts components/sector/sector-card-sheet.tsx
git commit -m "fix(performance): contar entrega por productionCompletedAt e gate no setor"
```

---

### Task 5: PR

- [ ] **Step 1:** `npm run build` (com `DATABASE_URL` placeholder se o generate exigir).
- [ ] **Step 2:** Push `fix/ciclo-demanda-higiene`, PR descrevendo: gates iguais à UI, contentType na geração, indicadores alinhados à spec 2026-08-16.
- [ ] **Step 3:** Bugbot com `Diff: branch changes`. Security Review não é obrigatório (sem auth/upload novo), mas Bugbot sim.

---

## Critério de saída

Spec seção 5. Depois mergear e só então executar o plano da fatia 3.1 (`docs/superpowers/plans/2026-08-16-fase3-1-relatorios-performance.md`).
