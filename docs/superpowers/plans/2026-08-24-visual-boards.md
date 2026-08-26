# Etapa 2 — Operação (boards) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cartões de demanda, Kanban/setor, sheets e empty states passam a parecer Samps — a11y de card clicável, timer com `tabular-nums`, tipografia ≥ `text-xs` no chrome dos boards, empty states com verbo + próximo passo.

**Architecture:** Unificar o padrão do `components/agency/demand-card.tsx` (já é `<button>`) no `components/shared/demand-card.tsx` usado por quadro cliente e setor. Remover wrappers `div onClick` no kanban. Extrair empty de coluna reutilizável. Sheets só recebem polish de superfície/tipografia — sem mudar Server Actions.

**Tech Stack:** Next.js 14, Tailwind tokens Samps (Cyan/Ember), dnd-kit, shadcn Sheet/Card, Vitest (+ Testing Library se já no repo).

**Spec:** `docs/superpowers/specs/2026-08-24-samps-os-visual-system-design.md` (§5.1–5.4, §5.5 card a11y, §6 etapa 2)

**Pré-requisito:** `master` com #36+#37 mergeadas (tokens + shell). Branch: `feat/visual-boards`. Worktree: `.worktrees/feat-visual-boards`.

## Global Constraints

- Sem schema Prisma, auth logic, RLS, regras de negócio ou mudança de Server Actions.
- Sem remodelar configurações, painel gestão, performance, portal.
- Primary = Cyan; brand = Ember; warning/timer via tokens (`--warning` / amber tokenizado se existir) — evitar hex soltos novos.
- Card clicável = `<button type="button">` (ou equivalente teclado) — **nunca** `<div onClick>` sem role/keyboard.
- Tipografia do chrome de board/card: mínimo `text-xs` (sem `text-[10px]` / `text-[11px]` nestes arquivos tocados).
- Timer elapsed: classe `tabular-nums`.
- Empty de coluna: título + frase com verbo/próximo passo (não só “Nenhum cartão”).
- Conventional Commits em português; 1 commit por task.
- Gates finais: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`.

## File map

| Arquivo | Responsabilidade |
|---------|------------------|
| `components/shared/demand-card.tsx` | Card compartilhado acessível + timer `tabular-nums` |
| `components/shared/demand-card.test.tsx` | Vitest: root é button quando há onClick |
| `components/board/board-column-empty.tsx` | Empty de coluna (título + descrição) |
| `components/board/board-kanban.tsx` | Sem wrapper onClick; empty reutilizável |
| `components/sector/sector-board-view.tsx` | Empty nas colunas; card via onClick |
| `components/agency/demand-card.tsx` | Piso tipográfico `text-xs` no card agency |
| `components/agency/demand-board.tsx` | Empty com verbo |
| `components/board/card-detail-sheet.tsx` | Polish tipografia/superfície (mínimo) |
| `components/sector/sector-card-sheet.tsx` | Timer label `tabular-nums` se houver elapsed; tipografia |

## Estado atual

- `shared/demand-card`: `Card`/`div` com `onClick` — HIGH a11y da interface-review.
- `board-kanban` `SortableDemandCard`: outro `div onClick` em volta do card.
- Agency `DemandCard`: já `<button>` com focus ring — referência.
- Empty: “Nenhum cartão”; setor sem empty.
- Timer preview: amber hard-coded, sem `tabular-nums`.

---

### Task 1: Shared DemandCard acessível + timer (TDD)

**Files:**
- Modify: `components/shared/demand-card.tsx`
- Create: `components/shared/demand-card.test.tsx`

**Interfaces:**
- Props inalteradas: `{ demand, showOrigin?, className?, onClick? }`.
- Quando `onClick` definido: root = `<button type="button">` com as mesmas classes de card + `text-left w-full` + `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.
- Quando `onClick` ausente: root permanece não-interativo (`div`/`Card` sem cursor-pointer) — não inventar botão morto.
- Priority badge / origin: `text-xs` (não `text-[10px]`/`text-[11px]`).
- Timer block:

```tsx
<div className="rounded-md border border-warning/25 bg-warning/10 px-2 py-1 text-xs text-warning-foreground dark:border-warning/30 dark:bg-warning/15">
  ...
  <span className="tabular-nums">{demand.timerPreview.elapsedLabel}</span>
</div>
```

Se tokens `--warning` / `warning-foreground` **não** existirem em `globals.css`, usar `border-amber-500/25 bg-amber-500/10 … text-amber-950 dark:text-amber-200` **mas** manter `text-xs` + `tabular-nums`. Não criar tokens novos nesta task a menos que já existam.

- [ ] **Step 1: Branch**

Já existe `feat/visual-boards` no worktree `.worktrees/feat-visual-boards` — não recriar.

- [ ] **Step 2: Failing test**

```tsx
// components/shared/demand-card.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DemandCard } from "./demand-card";

const base = {
  id: "1",
  title: "Campanha X",
  type: "POST",
  status: "OPEN",
};

describe("DemandCard", () => {
  it("renders as a button when onClick is provided", () => {
    const onClick = vi.fn();
    render(<DemandCard demand={base} onClick={onClick} />);
    expect(screen.getByRole("button", { name: /Campanha X/i })).toBeTruthy();
  });

  it("does not render a button when onClick is omitted", () => {
    render(<DemandCard demand={base} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Campanha X")).toBeTruthy();
  });

  it("shows timer elapsed with tabular-nums class", () => {
    render(
      <DemandCard
        demand={{
          ...base,
          timerPreview: {
            status: "RUNNING",
            startedAt: new Date(),
            executor: { name: "Ana" },
            elapsedLabel: "15min",
          },
        }}
      />
    );
    const elapsed = screen.getByText("15min");
    expect(elapsed.className).toMatch(/tabular-nums/);
  });
});
```

Se `@testing-library/react` / `jsdom` não estiverem no `package.json`, **adicione como devDependency** nesta task (`npm i -D @testing-library/react @testing-library/dom jsdom`) e configure vitest environment jsdom **só se necessário** (verifique `vitest.config` existente antes).

- [ ] **Step 3: RED** — `npx vitest run components/shared/demand-card.test.tsx`

- [ ] **Step 4: Implement** — button vs div; tipografia; timer

- [ ] **Step 5: GREEN** — vitest + `npx tsc --noEmit`

- [ ] **Step 6: Commit**

```
feat(board): DemandCard acessivel com timer tabular-nums
```

---

### Task 2: BoardKanban — sem div onClick + empty

**Files:**
- Create: `components/board/board-column-empty.tsx`
- Modify: `components/board/board-kanban.tsx`

**Interfaces — BoardColumnEmpty:**

```tsx
export function BoardColumnEmpty({
  title = "Nenhum cartão nesta coluna",
  description = "Arraste uma demanda para cá ou crie um cartão.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-border px-3 py-6 text-center">
      <p className="text-xs font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
```

**SortableDemandCard:** remover o wrapper `<div onClick>`. Passar `onClick={() => onSelect(demand.id)}` para `DemandCard`. Manter `ref`/`listeners` no wrapper DnD externo (o sortable root pode continuar `div` — drag handle via listeners; o **click de abrir** fica no button interno).

Nota dnd-kit: `activationConstraint: { distance: 8 }` já existe — click no button não deve iniciar drag. Não mudar sensores.

Substituir “Nenhum cartão” por `<BoardColumnEmpty />`.

- [ ] **Step 1: Implement**
- [ ] **Step 2:** `npx tsc --noEmit`
- [ ] **Step 3: Commit**

```
feat(board): empty de coluna e click no DemandCard
```

---

### Task 3: Sector board — empty + tipografia de coluna

**Files:**
- Modify: `components/sector/sector-board-view.tsx`

**Interfaces:**
- Em colunas kanban vazias, renderizar `<BoardColumnEmpty />` (import do board).
- Contadores de coluna já usam `text-xs` — manter.
- `DemandCard` com `onClick` já passa a ser button via Task 1 — não adicionar wrappers `div onClick`.
- Não alterar lógica de claim/timer/actions.

- [ ] **Step 1: Implement**
- [ ] **Step 2:** `tsc`
- [ ] **Step 3: Commit**

```
feat(sector): empty states nas colunas do kanban
```

---

### Task 4: Agency demand card/board tipografia + empty

**Files:**
- Modify: `components/agency/demand-card.tsx` (só o card button, não precisa reescrever sheet)
- Modify: `components/agency/demand-board.tsx`

**Interfaces:**
- No card agency: trocar `text-[11px]` / `text-[10px]` por `text-xs`.
- Empty da coluna: usar `BoardColumnEmpty` ou o mesmo copy (título + descrição).
- Manter `<button>` e focus ring.

- [ ] **Step 1: Implement**
- [ ] **Step 2:** `tsc`
- [ ] **Step 3: Commit**

```
fix(agency): tipografia e empty do quadro de demandas
```

---

### Task 5: Sheets polish (mínimo) + gates + PR

**Files:**
- Modify: `components/board/card-detail-sheet.tsx` — só se houver `text-[10px]`/`text-[11px]` no chrome tocável; subir para `text-xs`. Sem mudar actions.
- Modify: `components/sector/sector-card-sheet.tsx` — se houver label de tempo decorrido, adicionar `tabular-nums`; tipografia `text-xs` onde tocado.
- Opcional orphan boards (`social-board` / `design-board`): se ainda tiverem “Nenhum cartão” e forem fáceis, trocar por `BoardColumnEmpty`; **não** investir em redesign se estiverem órfãos.

- [ ] **Step 1: Grep** `text-\[10px\]|text-\[11px\]|Nenhum cartão` nos arquivos da file map e corrigir o que for escopo.

- [ ] **Step 2: Gates**

```
npx tsc --noEmit
npm test
npm run lint
npm run build
```

- [ ] **Step 3: Push + PR**

```
git push -u origin HEAD
gh pr create --title "feat(boards): cartoes acessiveis e empty states (etapa 2)" --body "## Summary
- DemandCard compartilhado como button + timer tabular-nums
- Kanban/setor/agency: empty com verbo; sem div onClick
- Sheets: tipografia mínima

## Spec
docs/superpowers/specs/2026-08-24-samps-os-visual-system-design.md (etapa 2)

## Test plan
- [ ] Quadro cliente: Tab no card, Enter abre sheet
- [ ] Setor: coluna vazia com copy acionável
- [ ] Timer no card com digitos alinhados
- [ ] Claro/escuro
- [ ] tsc / test / lint / build
"
```

- [ ] **Step 4:** Não mergear nesta task — reportar URL.

---

## Spec coverage checklist (etapa 2)

| Requisito | Task |
|-----------|------|
| Card clicável acessível | 1, 2 |
| Timer `tabular-nums` | 1, 5 |
| Empty com verbo | 2, 3, 4 |
| Tipografia ≥ xs no chrome tocado | 1, 4, 5 |
| Sheets polish | 5 |
| Fora: settings / portal / gestão | — |

## Fora desta fatia

- Etapa 3 gestão/settings visual
- Etapa 4 portal
- Redesign DnD / nova criação de demanda
- Deletar `social-board` / `design-board` órfãos

## Self-review (autor do plano)

1. Spec etapa 2 coberta sem Kanban de produto novo.
2. a11y HIGH do card endereçado.
3. Sem TBD bloqueante.
