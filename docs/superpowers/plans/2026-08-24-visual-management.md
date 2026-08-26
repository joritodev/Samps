# Etapa 3 — Gestão visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Superfícies de gestão (painel, performance, equipe, agenda, clientes, hub de configurações) usam tokens Samps — piso tipográfico `text-xs`, tons semânticos (`primary`/`brand`/`success`/`warning`/`destructive`), menos Card genérico e zero paleta rainbow (violet/rose/emerald cru).

**Architecture:** Extrair um `MetricCard` compartilhado + helper de tons de status/setor. Aplicar por superfície sem mudar Server Actions, queries ou CSV. Hub de configurações só flatten visual — não restilizar cada `/configuracoes/*` filho.

**Tech Stack:** Next.js 14, Tailwind tokens (`primary`, `brand`, `success`, `warning`, `destructive`, `chart-*`), shadcn Card/Badge/Table, Vitest onde couber.

**Spec:** `docs/superpowers/specs/2026-08-24-samps-os-visual-system-design.md` (§4, §5.4, §6 etapa 3)

**Pré-requisito:** `master` com #38 mergeada. Branch: `feat/visual-management`. Worktree: `.worktrees/feat-visual-management`.

## Global Constraints

- Sem schema Prisma, auth, RLS, regras de negócio, mudança de CSV/filtros de performance.
- Sem boards/Kanban (etapa 2) e sem portal (etapa 4).
- Sem restilizar páginas filhas de `/configuracoes/*` além do hub.
- Primary = Cyan; brand = Ember (accent esparso, nunca danger).
- Produção/positivo → `success` ou `primary`; alerta → `warning`; risco → `destructive`.
- Tipografia chrome: mínimo `text-xs` (eliminar `text-[10px]` / `text-[11px]` nos arquivos tocados).
- Cards só onde há unidade interativa ou bloco de dados; header de página em `bg-background`, não `bg-card` desnecessário.
- Setor bars / charts: usar `chart-1`…`chart-5` (já alinhados a cyan/ember), não violet/rose/teal Tailwind.
- Se `warning` não existir no `tailwind.config.ts`, adicionar espelhando `success` (CSS já tem `--warning`).
- Conventional Commits em português; 1 commit por task.
- Gates finais: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`.
- Branch já existe no worktree — não recriar.

## File map

| Arquivo | Responsabilidade |
|---------|------------------|
| `tailwind.config.ts` | Garantir cor `warning` se ausente |
| `components/agency/metric-card.tsx` | Metric compartilhado (label `text-xs`, value `tabular-nums`) |
| `components/agency/status-tones.ts` | Helpers de classes semânticas (opcional, fino) |
| `app/(agency)/painel-gestao/page.tsx` | Usar MetricCard; sector bars chart-*; alerts warning |
| `components/agency/performance-dashboard.tsx` | MetricCard; emerald→success; tipografia |
| `components/agency/agenda-view.tsx` | Event tones tokens; chips `text-xs`; menos Card |
| `components/agency/team-view.tsx` | Badges semânticos; header paper |
| `components/agency/clients-view.tsx` | Status pills tokens; header paper |
| `components/agency/settings-hub.tsx` | Flatten hub (sem shadow stack) |

## Estado atual

- Metric duplicado em painel + performance com `text-[10px]` e tones `teal`/`emerald`.
- `sectorColors` rainbow no painel.
- Agenda com maps amber/emerald/rose e chips `text-[10px]`.
- Hub: `bg-card` header + tiles `shadow-sm`/`shadow-md`.

---

### Task 1: Primitivas MetricCard + warning no Tailwind

**Files:**
- Modify: `tailwind.config.ts` (só se `warning` ausente)
- Create: `components/agency/metric-card.tsx`
- Create: `components/agency/metric-card.test.tsx` (jsdom; jsdom já pinado em 24)

**Interfaces:**

```tsx
export type MetricTone = "default" | "primary" | "brand" | "success" | "warning" | "danger";

export function MetricCard({
  label,
  value,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  tone?: MetricTone;
  className?: string;
})
```

- Label: `text-xs font-medium uppercase tracking-wide text-muted-foreground`
- Value: `text-xl font-semibold tabular-nums tracking-tight`
- Borders/bg por tone usando tokens (`border-success/35 bg-success/5`, etc.); `danger` → `destructive`.
- Não usar emerald/amber/violet Tailwind.

Se `warning` faltar no Tailwind:

```ts
warning: {
  DEFAULT: "hsl(var(--warning))",
  foreground: "hsl(var(--warning-foreground))",
},
```

(Adicionar `--warning-foreground` em `globals.css` se não existir — espelhar success-foreground pattern.)

- [ ] **Step 1:** Confirmar warning no CSS/Tailwind; criar MetricCard + teste (render label + tone class)
- [ ] **Step 2:** `npx vitest run components/agency/metric-card.test.tsx` + `npx tsc --noEmit`
- [ ] **Step 3: Commit**

```
feat(agency): MetricCard compartilhado com tons Samps
```

---

### Task 2: Painel gestão + Performance

**Files:**
- Modify: `app/(agency)/painel-gestao/page.tsx`
- Modify: `components/agency/performance-dashboard.tsx`

**Interfaces:**
- Remover `Metric` local; importar `MetricCard`.
- Mapear tones: `teal` → `success`; manter `danger`/`primary`.
- `sectorColors` → `["bg-chart-1","bg-chart-2","bg-chart-3","bg-chart-4","bg-chart-5"]` (ciclar).
- Alertas amber → `border-warning/… bg-warning/… text-warning` (ou foreground).
- Eliminar `text-[10px]` nestes arquivos.
- Não mudar `getManagementOverview` / export CSV / filtros.

- [ ] **Step 1: Implement**
- [ ] **Step 2:** `tsc`
- [ ] **Step 3: Commit**

```
feat(agency): tokens Samps no painel e performance
```

---

### Task 3: Agenda

**Files:**
- Modify: `components/agency/agenda-view.tsx`
- Optional touch: `components/agency/schedule-view.tsx` **somente** se ainda usado em rota viva e tiver `text-[10px]` — senão skip.

**Interfaces:**
- Maps de cor de evento → tokens (`primary`, `brand`, `success`, `warning`, `destructive`, `muted`) — sem emerald/rose/amber cru.
- Chips/labels: `text-xs`.
- Reduzir Card chrome óbvio (header/filtros podem ficar em paper + border-b).
- Sem mudar lógica de eventos/datas.

- [ ] **Step 1: Implement**
- [ ] **Step 2:** `tsc`
- [ ] **Step 3: Commit**

```
feat(agency): agenda com tokens e tipografia xs
```

---

### Task 4: Equipe + Clientes

**Files:**
- Modify: `components/agency/team-view.tsx`
- Modify: `components/agency/clients-view.tsx`
- Optional light: `client-detail-view.tsx` — só badges `text-[10px]` / emerald-amber se grepar encontrar; **não** redesenhar o Card farm.

**Interfaces:**
- Headers: `bg-background` (ou transparente) em vez de `bg-card` sticky genérico, se seguro.
- Badges ausência/status → `destructive` / `warning` / `success` / `secondary`.
- Tipografia ≥ `text-xs`.
- Sem mudar sheets de ausência ou actions.

- [ ] **Step 1: Implement**
- [ ] **Step 2:** `tsc`
- [ ] **Step 3: Commit**

```
feat(agency): equipe e clientes com tons semânticos
```

---

### Task 5: Hub configurações + gates + PR

**Files:**
- Modify: `components/agency/settings-hub.tsx`

**Interfaces:**
- Header: `bg-background` + `border-b` (sem `bg-card`).
- Grid: `bg-background` (não `bg-muted/30`).
- Tiles: `border border-border bg-card` **sem** `shadow-sm`/`shadow-md`; hover `bg-muted/40` ou `border-primary/40`.
- Icon well: `bg-primary/10 text-primary` (marca cyan).
- Copy intacta; permissões intactas.

- [ ] **Step 1: Implement hub**
- [ ] **Step 2: Grep** `text-\[10px\]|text-\[11px\]|emerald-|violet-|rose-500` nos arquivos do file map — limpar residual de escopo.
- [ ] **Step 3: Gates**

```
npx tsc --noEmit
npm test
npm run lint
npm run build
```

- [ ] **Step 4: Push + PR**

```
feat(management): gestao visual Samps (etapa 3)
```

Body: summary painel/performance/agenda/equipe/clientes/hub; Spec etapa 3; test plan claro/escuro + mobile; tsc/test/lint/build.

- [ ] **Step 5:** Não mergear — reportar URL.

---

## Spec coverage checklist (etapa 3)

| Requisito | Task |
|-----------|------|
| Painel gestão visual | 2 |
| Performance visual | 2 |
| Agenda visual | 3 |
| Equipe + clientes | 4 |
| Hub configs visual | 5 |
| Tipografia ≥ xs | 1–5 |
| Tons semânticos / chart | 1–2 |
| Fora: portal, boards, settings filhos | — |

## Fora desta fatia

- Etapa 4 portal
- Roadmap 3.1 lógica de relatórios (já existe; só visual aqui)
- Subpáginas de configurações
- Remodelar client-detail Card farm completo

## Self-review (autor do plano)

1. Spec etapa 3 coberta sem portal.
2. MetricCard evita drift painel/performance.
3. Sem TBD bloqueante.
