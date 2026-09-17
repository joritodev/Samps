# Demandas: visibilidade + avulsa + checklist — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement **uma fatia por sessão**. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar até sexta 19/09 a hierarquia de visão (Trello), criação de demanda avulsa no quadro do cliente e checklist multi-responsável que alimenta o individual.

**Architecture:** Filtro canônico `buildDemandVisibilityWhere` em todas as listagens internas; avulsa = `Demand` EXTRA já atribuída; checklist = demandas filhas (`parentDemandId`) reutilizando assignment/Meu Painel.

**Tech Stack:** Next.js App Router, Server Actions, Prisma, Vitest, shadcn Sheet/Select existentes.

**Spec:** `docs/superpowers/specs/2026-09-15-demandas-visibilidade-avulsa-checklist-design.md`

## Global Constraints

- Unidade = **1 fatia / 1 PR** (A, depois B, depois C). Não misturar schema de checklist na Fatia A.
- Conventional Commits em português; `npx tsc --noEmit` limpo por task.
- Schema / permissão / RLS: só o que a fatia detalha; se precisar mais → BLOCKED e replanejar.
- Cliente externo e RLS `client_scope` **não** mudam.
- Não reabrir chat, anexos 3.2, templates de checklist, nem geração automática de `ContractService`.
- Cópia de UI em português; sem emojis em commits/PRs.
- Gates: Fatia A Bugbot; Fatia B Bugbot; Fatia C Bugbot + Security Review (schema + assign).

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---------|------------------|
| `lib/permissions/demand-visibility.ts` | Helper puro de filtro hierárquico |
| `lib/permissions/demand-visibility.test.ts` | Testes do helper |
| `app/(agency)/demandas/page.tsx` | Usa helper; copy do subtítulo |
| `app/(agency)/setores/[slug]/page.tsx` | Remove leitura cruzada demo 3.4 |
| `lib/services/sector-board.service.ts` | Já tem collaborator/leader; alinhar se necessário |
| `app/actions/create-extra-demand.ts` | Action avulsa (Fatia B) |
| `components/board/extra-demand-sheet.tsx` | UI avulsa no quadro do cliente |
| `prisma/schema.prisma` + migration | `parentDemandId`, `checklistOrder`, `isChecklistItem` (Fatia C) |
| `lib/services/checklist.service.ts` | add/assign/complete filhos |
| `components/board/demand-checklist.tsx` | UI checklist no sheet |

---

# Fatia A — Visibilidade hierárquica

**Branch:** `feat/demandas-visibilidade-hierarquica`  
**Demo:** Bia só vê as dela; líder o setor; gestão tudo; sem `/setores` cruzado para colaborador.

### Task A1: Helper `buildDemandVisibilityWhere`

**Files:**
- Create: `lib/permissions/demand-visibility.ts`
- Create: `lib/permissions/demand-visibility.test.ts`
- Modify: none yet

**Interfaces:**
- Consumes: `SessionUser` (`types/auth`), `Prisma.DemandWhereInput`
- Produces: `buildDemandVisibilityWhere(user, opts?: { ledSectorIds?: string[] }): Prisma.DemandWhereInput`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildDemandVisibilityWhere } from "./demand-visibility";
import type { SessionUser } from "@/types/auth";

function user(partial: Partial<SessionUser> & Pick<SessionUser, "id" | "userType" | "permissions">): SessionUser {
  return {
    name: "t",
    email: "t@t.com",
    roleId: "r",
    roleName: "r",
    sectorId: null,
    clientIds: [],
    mustResetPassword: false,
    ...partial,
  } as SessionUser;
}

describe("buildDemandVisibilityWhere", () => {
  it("gestão vê tudo", () => {
    const where = buildDemandVisibilityWhere(
      user({ id: "g", userType: "MANAGEMENT", permissions: ["clients.view_all"] })
    );
    expect(where).toEqual({});
  });

  it("admin vê tudo", () => {
    const where = buildDemandVisibilityWhere(
      user({ id: "a", userType: "ADMIN", permissions: ["clients.view_all"] })
    );
    expect(where).toEqual({});
  });

  it("colaborador só assignee ou requester", () => {
    const where = buildDemandVisibilityWhere(
      user({
        id: "b",
        userType: "DESIGNER",
        permissions: ["clients.view_assigned"],
        clientIds: ["c1"],
      })
    );
    expect(where).toEqual({
      OR: [{ assigneeId: "b" }, { requesterId: "b" }],
    });
  });

  it("líder vê setor liderado ∪ próprias", () => {
    const where = buildDemandVisibilityWhere(
      user({
        id: "m",
        userType: "DESIGNER",
        permissions: ["clients.view_assigned"],
      }),
      { ledSectorIds: ["sec-design"] }
    );
    expect(where).toEqual({
      OR: [
        { sectorId: { in: ["sec-design"] } },
        { assigneeId: "m" },
        { requesterId: "m" },
      ],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/permissions/demand-visibility.test.ts`  
Expected: FAIL (módulo inexistente)

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/types/auth";

export function buildDemandVisibilityWhere(
  user: SessionUser,
  opts?: { ledSectorIds?: string[] }
): Prisma.DemandWhereInput {
  const isMgmt =
    user.userType === "ADMIN" || user.userType === "MANAGEMENT";
  if (isMgmt) return {};

  const led = opts?.ledSectorIds?.filter(Boolean) ?? [];
  if (led.length > 0) {
    return {
      OR: [
        { sectorId: { in: led } },
        { assigneeId: user.id },
        { requesterId: user.id },
      ],
    };
  }

  return {
    OR: [{ assigneeId: user.id }, { requesterId: user.id }],
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run lib/permissions/demand-visibility.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/permissions/demand-visibility.ts lib/permissions/demand-visibility.test.ts
git commit -m "feat(demandas): helper de visibilidade hierárquica"
```

### Task A2: Resolver setores liderados + aplicar em `/demandas`

**Files:**
- Create: `lib/permissions/led-sectors.ts` (ou função async no mesmo arquivo de visibility)
- Modify: `app/(agency)/demandas/page.tsx`
- Test: `lib/permissions/demand-visibility.test.ts` (unit do where já cobre; smoke manual)

**Interfaces:**
- Consumes: `buildDemandVisibilityWhere`, `db.sector.findMany({ where: { leaderId } })`
- Produces: listagem de `/demandas` filtrada

- [ ] **Step 1: Add async loader**

```ts
// lib/permissions/led-sectors.ts
import { db } from "@/lib/db";

export async function listLedSectorIds(userId: string): Promise<string[]> {
  const rows = await db.sector.findMany({
    where: { leaderId: userId, isActive: true },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}
```

- [ ] **Step 2: Replace where em `demandas/page.tsx`**

Remover o `OR` com `clientId: scope`. Usar:

```ts
import { buildDemandVisibilityWhere } from "@/lib/permissions/demand-visibility";
import { listLedSectorIds } from "@/lib/permissions/led-sectors";

const ledSectorIds = await listLedSectorIds(user.id);
const visibility = buildDemandVisibilityWhere(user, { ledSectorIds });
const where: Prisma.DemandWhereInput = {
  ...visibility,
  // opcional: excluir filhos checklist na Fatia C; agora inexistentes
};
```

Subtítulo:
- gestão: `"Visão global da operação"`
- líder: `"Quadro do seu setor e suas demandas"`
- colaborador: `"Suas demandas"`

- [ ] **Step 3: tsc + vitest**

Run: `npx tsc --noEmit && npx vitest run lib/permissions/demand-visibility.test.ts`

- [ ] **Step 4: Commit**

```bash
git add lib/permissions/led-sectors.ts app/(agency)/demandas/page.tsx
git commit -m "feat(demandas): filtrar quadro geral por hierarquia"
```

### Task A3: Fechar leitura cruzada em `/setores/[slug]`

**Files:**
- Modify: `app/(agency)/setores/[slug]/page.tsx`
- Modify: `types/auth.ts` se precisar helper `isSectorLeader` (só se já não existir)

**Interfaces:**
- Consumes: `isSectorCollaborator`, `getSectorSlugForUserType`, `getDashboardPath`
- Produz: colaborador só acessa o slug do próprio setor **ou** é redirecionado; gestão acessa todos; líder acessa o setor que lidera

- [ ] **Step 1: Gate de acesso**

Substituir a lógica “Demo 3.4: colaborador pode olhar outras filas só em leitura” por:

```ts
const isMgmt = user.userType === "ADMIN" || user.userType === "MANAGEMENT";
const ownSlug = getSectorSlugForUserType(user.userType);
const sector = await getSectorBySlug(params.slug === "social" ? "social" : slug);
// para social, carregar sector social
const isLeader = sector?.leaderId === user.id;

if (!isMgmt && !isLeader && ownSlug !== params.slug) {
  redirect(ownSlug ? `/meu-painel/${ownSlug}` : getDashboardPath(user.userType));
}

const readOnly = false; // operação real no próprio setor; gestão/líder escrevem conforme canAssign
// colaborador no próprio /setores: redirect preferencial ao Meu Painel
if (!isMgmt && !isLeader && collaborator && ownSlug === params.slug) {
  redirect(`/meu-painel/${ownSlug}`);
}
```

Ajustar ramos `social` e operacionais com a mesma regra. Remover `readOnlyHint` da demo 3.4.

- [ ] **Step 2: Smoke mental / teste se existir**

Se houver teste de página, atualizar expectativa. Senão, checklist manual no PR.

- [ ] **Step 3: Commit**

```bash
git add app/(agency)/setores/[slug]/page.tsx
git commit -m "fix(setores): remover leitura cruzada entre setores"
```

### Task A4: Alinhar Meu Painel + nota + PR

**Files:**
- Modify: `app/(agency)/meu-painel/design/page.tsx` (e video/trafego) — descriptions
- Create: `docs/superpowers/notas/2026-09-15-visibilidade-hierarquica.md`
- Modify: `docs/superpowers/plans/2026-08-04-roadmap-master.md` (próxima fatia → B após merge)

- [ ] **Step 1: Copy dos painéis**

Description colaborador: `"Suas demandas e fila disponível do setor"`.  
Líder (`leaderFullView`): `"Fila completa do setor"`.

- [ ] **Step 2: Nota curta**

Registrar decisão: fim da demo 3.4 de leitura cruzada; hierarquia Trello.

- [ ] **Step 3: Gates**

```bash
npx tsc --noEmit
npm run lint
npx vitest run lib/permissions/demand-visibility.test.ts
```

- [ ] **Step 4: PR Fatia A**

Título: `feat(demandas): visibilidade hierárquica (individual / setor / gestão)`  
Body: passos de teste com contas seed (designer, líder design, gestão).

- [ ] **Step 5: Bugbot na PR**

---

# Fatia B — Demanda avulsa no quadro do cliente

**Branch:** `feat/demanda-avulsa-quadro-cliente`  
**Depende de:** Fatia A mergeada (visibilidade faz a demo “caiu no individual” ficar correta).  
**Demo:** Social cria avulsa no quadro do cliente → aparece no Meu Painel do responsável.

### Task B1: Action `createExtraDemandAction`

**Files:**
- Create: `app/actions/create-extra-demand.ts`
- Create: `app/actions/create-extra-demand.test.ts` (mock db se o padrão do repo permitir; senão teste de schema zod em arquivo puro)
- Modify: `lib/services/demands.service.ts` — garantir suporte a `assigneeId` + status ASSIGNED path **ou** chamar `assignDemand` após create

**Interfaces:**
- Consumes: `requirePermission` / `hasPermission` (`demands.extra_create` ∨ `demands.create`), `createDemand`, `assignDemand`
- Produces: `{ success, id } | { error }`

- [ ] **Step 1: Zod + action**

```ts
const schema = z.object({
  clientId: z.string().min(1),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(4000).optional(),
  sectorId: z.string().min(1),
  assigneeId: z.string().min(1),
  priorityId: z.string().min(1).optional(),
  dueDate: z.string().optional(),
});

export async function createExtraDemandAction(input: z.infer<typeof schema>) {
  const actor = await requireAuth();
  const can =
    hasPermission(actor.permissions, "demands.extra_create") ||
    hasPermission(actor.permissions, "demands.create");
  if (!can) return { error: "Sem permissão para criar demanda avulsa." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  // createDemand type EXTRA, origin EXTRA, status DEMANDED, sectorId, assigneeId
  // assignDemand(demandId, assigneeId, actor, AssignmentMethod.MANAGEMENT)
  // revalidateOperationalViews + revalidatePath(`/clientes/${clientId}/quadro`)
}
```

- [ ] **Step 2: Teste de regra de permissão (puro)**

Extrair `canCreateExtraDemand(permissions: string[]): boolean` e testar true/false.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(demandas): action de demanda avulsa com responsável obrigatório"
```

### Task B2: Sheet UI no quadro do cliente

**Files:**
- Create: `components/board/extra-demand-sheet.tsx`
- Modify: `components/board/board-header.tsx` — botão condicional
- Modify: `app/(agency)/clientes/[id]/quadro/page.tsx` — passar `canCreateExtra`, setores, usuários do setor (ou carregar via action)

**Interfaces:**
- Consumes: `createExtraDemandAction`
- UI: título, descrição, setor, responsável (select filtrado pelo setor), prazo

- [ ] **Step 1: Sheet**

Reusar padrões de `components/agency/new-demand-sheet.tsx` (campos + pending). Label **Demanda avulsa**.

- [ ] **Step 2: Gate no header**

Só renderiza se `canCreateExtra`.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(quadro): CTA e sheet de demanda avulsa"
```

### Task B3: Aceite + PR Fatia B

- [ ] Smoke: login `social@` → quadro Bella → criar avulsa → login `designer@` → Meu Painel.
- [ ] `tsc`, lint, vitest.
- [ ] PR + Bugbot.

---

# Fatia C — Checklist multi-responsável (MVP)

**Branch:** `feat/demanda-checklist-filhos`  
**Depende de:** B recomendada (não obrigatória tecnicamente).  
**Demo:** 3 checkpoints com 3 responsáveis → 3 individuais; progresso no pai.

### Task C1: Migration Prisma

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/YYYYMMDDHHMMSS_demand_checklist_parent/migration.sql`

```prisma
parentDemandId   String?
checklistOrder   Int?
isChecklistItem  Boolean @default(false)

parent   Demand?  @relation("DemandChecklist", fields: [parentDemandId], references: [id], onDelete: Cascade)
children Demand[] @relation("DemandChecklist")

@@index([parentDemandId])
```

- [ ] **Step 1: Editar schema + `npx prisma migrate dev --name demand_checklist_parent`** (ou SQL manual no padrão do repo).
- [ ] **Step 2: `npx prisma generate`**
- [ ] **Step 3: Commit migration + schema juntos**

```bash
git commit -m "feat(schema): parentDemandId para checklist de demanda"
```

### Task C2: `checklist.service` + testes

**Files:**
- Create: `lib/services/checklist.service.ts`
- Create: `lib/services/checklist.service.test.ts` (funções puras de progresso + regras; mocks se necessário)

**Interfaces:**
- `addChecklistItem(user, parentId, { title, assigneeId?, sectorId? })`
- `assignChecklistItem(user, childId, assigneeId)`
- `completeChecklistItem(user, childId)`
- `getChecklistProgress(parentId): { done: number; total: number }`

Regras:
- `requirePermission` path via actions: `demands.edit` para add; assign usa mesma regra de `assignDemandAction` (perm ∨ líder).
- Filha herda `clientId`; `isChecklistItem=true`; `checklistOrder = max+1`.
- Com `assigneeId`, chamar lógica de assignment existente.

- [ ] **Step 1: Teste de progresso**

```ts
expect(computeChecklistProgress([{ status: "DONE" }, { status: "DEMANDED" }])).toEqual({
  done: 1,
  total: 2,
});
```

- [ ] **Step 2: Implementar service**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat(demandas): serviço de checklist via demandas filhas"
```

### Task C3: Actions + UI no sheet

**Files:**
- Create: `app/actions/checklist.ts`
- Create: `components/board/demand-checklist.tsx`
- Modify: `components/board/card-detail-sheet.tsx` (ou demand sheet usado no quadro) — seção Checklist se `!card.isChecklistItem`
- Modify: listagens (`demandas/page.tsx`, sector board) — default **ocultar** `isChecklistItem` na visão kanban global; Meu Painel **mostra** filhas atribuídas

- [ ] **Step 1: Actions finas** (`addChecklistItemAction`, etc.) + revalidate.
- [ ] **Step 2: UI lista + add + select responsável**.
- [ ] **Step 3: Chip no card do Meu Painel** `"Parte de: …"` quando `parentDemandId`.
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(demandas): UI de checklist multi-responsável"
```

### Task C4: Gates Security + PR Fatia C

- [ ] `tsc`, lint, vitest, build.
- [ ] Security Review (schema + assign).
- [ ] Bugbot.
- [ ] PR com roteiro: demanda podcast → 3 itens → 3 logins seed.
- [ ] Atualizar roadmap: próxima fatia volta a 3.2 anexos (ou o que a Samps priorizar após demo).

---

## Cronograma sugerido (iterativo com a Samps)

| Dia | Entrega | Mostrar para ele |
|-----|---------|------------------|
| ter 15 | Spec + este plano (PR docs) | Validar defaults / perguntas §11 da spec |
| qua 17 | Fatia A em preview | Hierarquia Bia / Matias / Gestão |
| qui 18 | Fatia B | Avulsa no quadro → individual |
| sex 19 | Fatia C MVP (ou parcial) | Checklist 3 pessoas; se apertar, só add+assign sem reorder |

Se o vídeo chegar no meio: abrir nota `docs/superpowers/notas/2026-09-XX-video-checklist.md` e ajustar só a fatia ainda não mergeada.

## Spec coverage checklist

| Requisito da spec | Task |
|-------------------|------|
| Colaborador só próprias em `/demandas` | A1–A2 |
| Líder vê setor | A1–A2 |
| Gestão vê tudo | A1–A2 |
| Fim leitura cruzada setores | A3 |
| Meu Painel individual vs líder | A4 (+ existente `leaderFullView`) |
| CTA avulsa no quadro do cliente | B2 |
| Responsável obrigatório → individual | B1 |
| Permissão extra_create/create | B1 |
| Checklist = demandas filhas | C1–C2 |
| Checkpoint → individual | C2–C3 |
| Progresso no pai | C2–C3 |
| Ocultar filhos no kanban global | C3 |
| Fora de escopo templates/contrato auto | — (não há task) |

## Prompt de abertura (por fatia)

```text
Você está no repositório Samps OS.
Antes de qualquer código, leia e siga:
1. docs/superpowers/plans/2026-08-07-playbook-metodologia.md
2. docs/superpowers/plans/2026-08-04-roadmap-master.md
3. O plano da fatia: docs/superpowers/plans/2026-09-15-demandas-visibilidade-avulsa-checklist.md (seção Fatia <A|B|C>)
4. Spec: docs/superpowers/specs/2026-09-15-demandas-visibilidade-avulsa-checklist-design.md
5. Ledger: .superpowers/sdd/progress.md

Fatia desta sessão: <A|B|C>
Metodologia obrigatória: subagent-driven-development
Gates: <Bugbot | Bugbot+Security>

Regras:
- Não começar outra fatia nesta sessão.
- Não alterar schema/auth/permissão fora do que a fatia detalha.
- Commit Conventional em português; 1 commit por task com tsc limpo.
```
