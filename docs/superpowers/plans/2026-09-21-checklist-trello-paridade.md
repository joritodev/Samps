# Checklist tipo Trello — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o checklist pesado por UX tipo Trello (N listas nomeadas, item leve, Enter para add, checkbox) onde atribuir responsável cria demanda-filha no Meu Painel.

**Architecture:** Novas tabelas `Checklist` + `ChecklistItem` no pai. Item sem `assigneeId` não cria `Demand`. Ao atribuir, cria/reusa filha `isChecklistItem` e seta `linkedDemandId`. Toggle `isDone` sincroniza conclusão/reabertura da filha. UI reescrita em `demand-checklist.tsx`; service/actions substituem o fluxo “form → addChecklistItem”.

**Tech Stack:** Next.js 14, Prisma/Neon, Vitest, Sonner, componentes `components/ui/*`.

**Spec:** `docs/superpowers/specs/2026-09-21-checklist-trello-paridade-design.md`

## Global Constraints

- Branch: `feat/checklist-trello-paridade` a partir de `origin/master` (não misturar com `fix/avisos-toast-design`).
- Unidade = 1 PR desta fatia.
- Schema / RLS / assign: se o implementer precisar mudar permissão além do plano → parar e replanejar.
- Nome de modelo: `Checklist` / `ChecklistItem` (não `DemandChecklist` — relation pai/filho já usa esse nome).
- Drag-and-drop, templates, “converter em card”: fora.
- Conventional Commits em português; `npx tsc --noEmit` limpo a cada commit.
- Não commitar `.env`, `graphify-out/`, dumps.

## File map

| Arquivo | Responsabilidade |
|---------|------------------|
| `prisma/schema.prisma` + migration | Modelos + relations + data backfill |
| `lib/agency/checklist-progress.ts` | Progresso por `isDone` (e helper `%`) |
| `lib/services/checklist.service.ts` | CRUD listas/items + assign + toggle + delete |
| `app/actions/checklist.ts` | Actions finas + zod |
| `components/board/demand-checklist.tsx` | UI Trello |
| `components/board/card-detail-sheet.tsx` | Passa `checklists` em vez de só `childDemands` |
| `lib/services/cards.service.ts` (e loaders) | Include `checklists.items` |
| Testes espelhando os paths acima | |

---

### Task 1: Schema Prisma + migration + backfill

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/YYYYMMDDHHMMSS_checklist_trello/migration.sql`

**Interfaces:**
- Produces: models `Checklist`, `ChecklistItem`; em `Demand`: `checklists Checklist[]`, `linkedChecklistItem ChecklistItem?`; em `User`: `checklistItems ChecklistItem[]`

- [ ] **Step 1: Adicionar models e relations no schema**

Em `Demand`, após `childDemands`:

```prisma
  checklists          Checklist[]
  linkedChecklistItem ChecklistItem?
```

Em `User`, após relations de demanda:

```prisma
  checklistItems ChecklistItem[]
```

Novos models (no final do arquivo schema, perto de outros models de demanda):

```prisma
model Checklist {
  id        String   @id @default(cuid())
  demandId  String
  title     String
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  demand Demand          @relation(fields: [demandId], references: [id], onDelete: Cascade)
  items  ChecklistItem[]

  @@index([demandId])
}

model ChecklistItem {
  id             String    @id @default(cuid())
  checklistId    String
  title          String
  isDone         Boolean   @default(false)
  sortOrder      Int       @default(0)
  assigneeId     String?
  dueDate        DateTime?
  linkedDemandId String?   @unique
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  checklist    Checklist @relation(fields: [checklistId], references: [id], onDelete: Cascade)
  assignee     User?     @relation(fields: [assigneeId], references: [id], onDelete: SetNull)
  linkedDemand Demand?   @relation(fields: [linkedDemandId], references: [id], onDelete: SetNull)

  @@index([checklistId])
  @@index([assigneeId])
}
```

- [ ] **Step 2: Gerar migration**

Run: `npx prisma migrate dev --name checklist_trello`  
Expected: pasta nova em `prisma/migrations/` + client gerado.

- [ ] **Step 3: Acrescentar SQL de backfill na migration** (mesmo arquivo, após CREATE TABLE)

```sql
-- Um Checklist "Checklist" por pai que já tem filhos isChecklistItem
INSERT INTO "Checklist" ("id", "demandId", "title", "sortOrder", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text),
  d."parentDemandId",
  'Checklist',
  0,
  NOW(),
  NOW()
FROM "Demand" d
WHERE d."isChecklistItem" = true
  AND d."parentDemandId" IS NOT NULL
GROUP BY d."parentDemandId";

INSERT INTO "ChecklistItem" (
  "id", "checklistId", "title", "isDone", "sortOrder",
  "assigneeId", "dueDate", "linkedDemandId", "createdAt", "updatedAt"
)
SELECT
  md5(random()::text || clock_timestamp()::text || d.id),
  c.id,
  d.title,
  d.status IN ('DONE', 'PUBLISHED', 'DELIVERED'),
  COALESCE(d."checklistOrder", 0),
  d."assigneeId",
  d."dueDate",
  d.id,
  NOW(),
  NOW()
FROM "Demand" d
JOIN "Checklist" c ON c."demandId" = d."parentDemandId" AND c.title = 'Checklist'
WHERE d."isChecklistItem" = true
  AND d."parentDemandId" IS NOT NULL;
```

Nota: se o projeto usa `cuid()` via app e não `md5`, preferir backfill via script Node one-shot commitado em `scripts/backfill-checklist-trello.ts` rodado uma vez após migrate — nesse caso a migration só cria tabelas; o Step 3 vira o script. Escolher o padrão já usado no repo (olhar migrations com INSERT). Se nenhum INSERT em migrations: usar script.

- [ ] **Step 4: `npx prisma generate` + `npx tsc --noEmit`**

Expected: limpo.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): Checklist e ChecklistItem tipo Trello"
```

---

### Task 2: Progresso por `isDone`

**Files:**
- Modify: `lib/agency/checklist-progress.ts`
- Modify: `lib/agency/checklist-progress.test.ts`

**Interfaces:**
- Produces: `computeChecklistProgress(items: { isDone: boolean }[]): { done: number; total: number; percent: number }`
- Mantém overload temporário aceitando `{ status: string }` **ou** migra todos callers de uma vez nesta task (preferir migrar callers: só testes + service).

- [ ] **Step 1: Teste falhando**

```ts
import { describe, expect, it } from "vitest";
import { computeChecklistProgress } from "./checklist-progress";

describe("computeChecklistProgress", () => {
  it("conta isDone", () => {
    expect(
      computeChecklistProgress([{ isDone: true }, { isDone: false }, { isDone: true }])
    ).toEqual({ done: 2, total: 3, percent: 67 });
  });

  it("lista vazia = 0%", () => {
    expect(computeChecklistProgress([])).toEqual({
      done: 0,
      total: 0,
      percent: 0,
    });
  });
});
```

- [ ] **Step 2: Run**

Run: `npx vitest run lib/agency/checklist-progress.test.ts`  
Expected: FAIL (assinatura antiga).

- [ ] **Step 3: Implementar**

```ts
export function computeChecklistProgress(
  items: { isDone: boolean }[]
): { done: number; total: number; percent: number } {
  const total = items.length;
  const done = items.filter((i) => i.isDone).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, percent };
}
```

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "refactor(checklist): progresso por isDone e percent"
```

---

### Task 3: Service — listas, items leves, assign, toggle, delete

**Files:**
- Rewrite: `lib/services/checklist.service.ts`
- Rewrite: `lib/services/checklist.service.test.ts` (mocks `db` no padrão do arquivo atual)

**Interfaces (Produces):**

```ts
createChecklist(user, demandId, title?: string): Promise<Checklist>
renameChecklist(user, checklistId, title: string): Promise<Checklist>
deleteChecklist(user, checklistId): Promise<void>
addChecklistItem(user, checklistId, title: string): Promise<ChecklistItem> // leve, sem Demand
updateChecklistItemTitle(user, itemId, title: string): Promise<ChecklistItem>
setChecklistItemDueDate(user, itemId, dueDate: Date | null): Promise<ChecklistItem>
assignChecklistItem(user, itemId, assigneeId: string): Promise<ChecklistItem> // cria/reassign Demand
unassignChecklistItem(user, itemId): Promise<ChecklistItem>
toggleChecklistItemDone(user, itemId, isDone: boolean): Promise<ChecklistItem>
deleteChecklistItem(user, itemId): Promise<void>
listChecklistsForDemand(demandId: string): Promise<Array<Checklist & { items: ... }>>
```

**Regras (copiar da spec):**
- `assertCanEditParent` via checklist→demand ou demandId; bloquear se `demand.isChecklistItem`.
- `addChecklistItem`: só título; `sortOrder = max+1`; sem `linkedDemandId`.
- `assignChecklistItem`: se sem link → `db.demand.create` como hoje (`isChecklistItem`, `parentDemandId` = demand do checklist, herda client/board/type, description default `""` ou título); `distributeDemandToSector` / assignment ASSIGNED; set `linkedDemandId` + `assigneeId` no item. Se já tem link → reassign filha + item.
- `unassignChecklistItem`: `assigneeId=null` no item; filha `assigneeId=null` (não apagar filha).
- `toggleChecklistItemDone(true)` com link: reutilizar lógica de `completeChecklistItem` atual (extraída para helper interno).
- `toggleChecklistItemDone(false)` com link: se status terminal → `DemandStatus.ASSIGNED` se `assigneeId`, senão `AVAILABLE`; assignment ativa → `ASSIGNED`; limpar `productionCompletedAt` se setado. Sem link: só `isDone`.
- `deleteChecklistItem`: se `linkedDemandId` e workSession ACTIVE/PAUSED → throw; senão delete filha (cascade assignments) + item, ou só item se sem link.
- `deleteChecklist`: para cada item, mesma regra; depois delete checklist (cascade items).

- [ ] **Step 1: Testes unitários com mock** — pelo menos:
  - add leve não chama `demand.create`
  - assign chama `demand.create` e seta `linkedDemandId`
  - toggle done sem link só atualiza item
  - delete bloqueia com sessão ativa

- [ ] **Step 2: Run — FAIL**

Run: `npx vitest run lib/services/checklist.service.test.ts`

- [ ] **Step 3: Implementar service**

Manter helpers de permissão/cliente do arquivo atual. Remover `AddChecklistItemInput` com description obrigatória.

- [ ] **Step 4: Run — PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(checklist): service Trello com item leve e assign"
```

---

### Task 4: Server actions

**Files:**
- Rewrite: `app/actions/checklist.ts`

**Interfaces:**
- Consome: funções da Task 3
- Produces actions: `createChecklistAction`, `renameChecklistAction`, `deleteChecklistAction`, `addChecklistItemAction` (`{ checklistId, clientId, title }`), `updateChecklistItemTitleAction`, `setChecklistItemDueDateAction`, `assignChecklistItemAction` (`{ itemId, clientId, assigneeId }`), `unassignChecklistItemAction`, `toggleChecklistItemDoneAction`, `deleteChecklistItemAction`
- Remover schema zod que exige `description`
- Cada action: `requireAuth` → service → `revalidateOperationalViews(clientId)` (+ path quadro se aplicável)

- [ ] **Step 1: Reescrever actions com zod mínimo**

Exemplo add:

```ts
const addItemSchema = z.object({
  checklistId: z.string().min(1),
  clientId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
});
```

Exemplo toggle:

```ts
const toggleSchema = z.object({
  itemId: z.string().min(1),
  clientId: z.string().min(1),
  isDone: z.boolean(),
});
```

- [ ] **Step 2: `npx tsc --noEmit`** — corrige callers quebrados temporariamente com `@ts-expect-error` **proibido**; Task 5 logo em seguida na mesma sessão se tsc quebrar UI.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(checklist): actions para fluxo Trello"
```

---

### Task 5: UI `DemandChecklist` tipo Trello

**Files:**
- Rewrite: `components/board/demand-checklist.tsx`
- Rewrite: `components/board/demand-checklist.test.tsx`
- Modify: `components/board/card-detail-sheet.tsx` (props)
- Modify: `lib/services/cards.service.ts` / `lib/actions/cards.actions.ts` — carregar `checklists: { include: { items: { include: { assignee: true, linkedDemand: { select: { id: true, status: true } } }, orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } }`

**Props novas:**

```ts
type ChecklistItemView = {
  id: string;
  title: string;
  isDone: boolean;
  sortOrder: number;
  dueDate?: Date | string | null;
  assigneeId?: string | null;
  assignee?: { id: string; name: string } | null;
  linkedDemandId?: string | null;
};

type ChecklistView = {
  id: string;
  title: string;
  sortOrder: number;
  items: ChecklistItemView[];
};

// DemandChecklist({ demandId, clientId, checklists, assignees, canEdit, onOpenLinkedDemand? })
```

**UI (better-ui / tokens Samps):**
- Sem form de descrição/formato.
- Por checklist: título editável (blur/Enter salva `renameChecklistAction`); barra `h-1.5` primary com width `${percent}%`; `n/m` tabular; menu `…` apagar + toggle “ocultar concluídos” (estado local).
- Item: checkbox (`toggleChecklistItemDoneAction`); título riscado se done; avatar iniciais / select membro no `…`; date input prazo; “Abrir” se `linkedDemandId`.
- Input rodapé placeholder “Adicionar um item”; onKeyDown Enter → `addChecklistItemAction`.
- Botão “Adicionar checklist” → `createChecklistAction` título default `"Checklist"` ou `"Checklist N"`.

- [ ] **Step 1: Atualizar teste UI** — espera checkbox + “Adicionar um item”; **não** espera label Descrição.

- [ ] **Step 2: Run teste — FAIL**

Run: `npx vitest run components/board/demand-checklist.test.tsx`

- [ ] **Step 3: Implementar componente + wiring sheet/loader**

- [ ] **Step 4: Run testes UI + `tsc` — PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(checklist): UI tipo Trello no sheet da demanda"
```

---

### Task 6: Limpeza callers legados + gates + PR

**Files:**
- Grep: `addChecklistItemAction`, `completeChecklistItemAction`, `childDemands` no sheet checklist, `description` obrigatória checklist
- Update: `components/sector/sector-card-sheet.test.tsx` se quebrar
- Update: `docs/superpowers/plans/2026-08-04-roadmap-master.md` — apontar spec/plano novos na fila checklist
- Update breve nota na spec 15/09 §6: “UI substituída por 2026-09-21-…”

- [x] **Step 1: Grep e remover dead code** (`listChecklistItems` antigo baseado só em childDemands se não usado)

- [x] **Step 2: `npx vitest run` relevante + `npx tsc --noEmit`**

- [ ] **Step 3: Smoke manual** (aceite da spec §9) — controller / humano

- [ ] **Step 4: Security Review + Bugbot** (schema + assign) — controller

- [ ] **Step 5: PR** — controller

Título: `feat(checklist): paridade Trello com itens leves e N listas`  
Body: link spec; checklist de teste = aceite §9.

```bash
git push -u origin HEAD
gh pr create # ...
```

---

## Spec coverage

| Spec § | Task |
|--------|------|
| §3 modelo | T1 |
| §4 regras 1–8 | T3 |
| §5 UI | T5 |
| §6 permissões | T3–T4 |
| §7 migração | T1 |
| §8 fora | Global Constraints |
| §9 aceite | T5–T6 |

## Placeholder scan

Nenhum TBD / “implement later”. Backfill: Step 3 Task 1 escolhe SQL vs script conforme padrão do repo (instrução explícita).

## Type consistency

- `ChecklistItem.isDone` / `linkedDemandId` / `assigneeId` iguais em schema, service, actions, UI.
- Actions usam `itemId` (ChecklistItem), não `childId`, exceto abrir demanda via `linkedDemandId`.
