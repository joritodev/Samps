# Etapa 4 — Portal visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Portal do cliente com identidade Samps (logo, tokens), densidade menor que a intranet, preview interno com banner semântico e saída da visualização.

**Architecture:** Componentes portal dedicados (`PortalPreviewBanner`, `PortalPage`, `PortalStat`) — não reutilizar `StatCard` agency na home. Sidebar espelha padrões agency (SampsLogo, Sheet mobile). Auth já unificado na etapa 1 — fora de escopo.

**Spec:** `docs/superpowers/specs/2026-08-24-samps-os-visual-system-design.md` (§6 etapa 4)

**Branch:** `feat/visual-portal` · Worktree: `.worktrees/feat-visual-portal`

## Global Constraints

- Sem schema/auth/RLS/API changes; `stopImpersonation` só via session `update` existente.
- Sem rebrand por cliente (`logoUrl`/`brandColor` como override CSS — opcional Task 2 se trivial).
- Densidade menor: `max-w-5xl`, `space-y-8`, cards leves (border, sem `shadow-sm` stack).
- Amber cru → `warning` tokens; `text-red-600` → `destructive`.
- Tipografia ≥ `text-xs`; home não expõe status interno cru (usar label amigável do overview).
- 1 commit/task; gates finais tsc/test/lint/build; PR sem merge.

---

### Task 1: Primitivas portal

**Files:**
- Create: `components/portal/portal-preview-banner.tsx`
- Create: `components/portal/portal-page.tsx`
- Create: `components/portal/portal-stat.tsx`

**Interfaces:**
- `PortalPreviewBanner({ children })` — `border-warning/30 bg-warning/10 text-sm text-foreground` (ou warning-foreground se legível).
- `PortalPage({ title, description?, children })` — `mx-auto max-w-5xl space-y-8`, header com `font-display text-2xl` (menor que agency `text-3xl`).
- `PortalStat({ label, value, icon? })` — border leve, `text-xs` label, `tabular-nums` value, sem shadow-soft agency.

- [ ] Commit: `feat(portal): primitivas de pagina e preview`

---

### Task 2: Layout + sidebar

**Files:**
- Modify: `app/(portal)/layout.tsx`
- Modify: `components/layout/portal-sidebar.tsx`
- Create: `components/portal/portal-preview-exit.tsx` (client: `update({ impersonatingClientId: null })` + `router.push('/clientes')`)

**Interfaces:**
- Layout: banner único via `PortalPreviewBanner` quando `isPreview`; main `p-6 md:p-8`; children wrapped in width constraint optional at layout or page level.
- Sidebar: `SampsLogo` compact (mark-only or withWordmark per agency); nav `py-2.5` (mais respiro); mobile Sheet como agency (`PanelLeft`, `aria-label="Abrir menu"`).
- Preview mode: botão "Sair da visualização" acima de Sair quando `user.userType !== 'EXTERNAL_CLIENT'`.
- Pass `isPreview` to sidebar.

- [ ] Commit: `feat(portal): sidebar SampsLogo e mobile`

---

### Task 3: Home cliente

**Files:**
- Modify: `app/(portal)/portal/page.tsx`

**Interfaces:**
- Remove duplicate preview banner (layout handles it).
- Use `PortalPage` + 3 `PortalStat` (Planejadas, Em produção, Publicadas — drop Entregues se redundante or keep 3 most useful).
- Lista recentes: rows leves `border rounded-lg px-4 py-3`, Badge com status amigável (`demand.externalStatus` or mapped), empty com verbo.
- No `StatCard` / heavy Card shadow.

- [ ] Commit: `feat(portal): home cliente com densidade menor`

---

### Task 4: Subpáginas + cores residuais

**Files:**
- Modify: `app/(portal)/portal/{calendario,entregas,publicacoes,materiais,arquivos,notificacoes}/page.tsx`
- Modify: `components/clients/portal-impersonation-redirect.tsx` (`text-destructive`)
- Modify: `components/clients/portal-preview-frame.tsx` if hardcoded colors

**Interfaces:**
- Wrap each in `PortalPage`.
- Cards: `rounded-xl border border-border/60 bg-card/50` sem shadow-sm.
- Empty: título + descrição com verbo (reuse pattern BoardColumnEmpty copy style).
- No business logic changes to queries.

- [ ] Commit: `feat(portal): subpaginas com scaffold unificado`

---

### Task 5: Gates + PR

- [ ] Gates + push + `gh pr create --title "feat(portal): vitrine cliente Samps (etapa 4)"`
- [ ] Do not merge

---

## Fora desta fatia

- Auth rewrite (feito etapa 1)
- Config filhos `/configuracoes/portal` visual deep dive
- Wire global AgencySettings portalName into layout (optional follow-up)
