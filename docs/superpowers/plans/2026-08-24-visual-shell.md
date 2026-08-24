# Etapa 1 — Shell visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chrome da intranet e auth passam a parecer Samps — logo câmera, layout sem “caixa única”, login em Tailwind/tokens, theme toggle com `prefers-reduced-motion`, a11y dos ícones do chrome.

**Architecture:** Reusar `SampsLogo` (etapa 0). Agency layout perde o wrapper card; sidebar troca o mark inventado pela logo. Auth deixa de carregar Vibe CSS (`VibeAuthShell`) e usa `Providers` + shell Tailwind split (form + painel visual). Motion do tema respeita reduced-motion via helper testável.

**Tech Stack:** Next.js 14 App Router, Tailwind, shadcn/ui, next-themes, Vitest, `SampsLogo` de `components/brand/samps-logo.tsx`.

**Spec:** `docs/superpowers/specs/2026-08-24-samps-os-visual-system-design.md` (§5.1–5.2, §5.5, §6 etapa 1)

**Pré-requisito:** PR #36 (`feat/visual-foundation`) **mergeada** em `master`, OU branch criada a partir de `feat/visual-foundation` e rebase em `master` após o merge. Não misturar Kanban/boards neste PR.

## Global Constraints

- Sem schema Prisma, auth logic, RLS ou regra de negócio.
- Sem remodelar Kanban, demand cards, sheets, settings pages (exceto copy/chrome já tocado), portal.
- Primary = Cyan; brand = Ember; CTA hero do login = gradiente Ember→Cyan.
- Controles só-ícone do chrome: `aria-label` ou `sr-only`.
- Theme toggle / login motion: honor `prefers-reduced-motion` (sem VT/anima se `reduce`).
- Branch: `feat/visual-shell`.
- Conventional Commits em português; 1 commit por task.
- Gates: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`.
- Preview `/design-system/*` pode permanecer; não é shell de produção do auth.

## File map

| Arquivo | Responsabilidade |
|---------|------------------|
| `lib/theme/prefers-reduced-motion.ts` | Helper SSR-safe + client check |
| `lib/theme/prefers-reduced-motion.test.ts` | Vitest (mock matchMedia) |
| `components/ui/animated-theme-toggler.tsx` | Skip VT quando reduce |
| `lib/theme/view-transition.ts` | Skip VT quando reduce |
| `app/(agency)/layout.tsx` | Remover wrapper card; fundo paper |
| `components/agency/agency-sidebar.tsx` | SampsLogo; active cyan; a11y |
| `components/layout/notification-bell.tsx` | aria-label no link/botão |
| `components/auth/samps-auth-shell.tsx` | Novo shell Tailwind (+ Providers) |
| `app/(auth)/layout.tsx` | Usar SampsAuthShell; dropar Vibe |
| `components/auth/login-view.tsx` | Rewrite Tailwind + SampsLogo + CTA gradiente |
| `components/auth/vibe-auth-shell.tsx` | Deletar se nenhum import restar |

## Estado atual

- Layout agency: `main` > `div.rounded-xl.border.shadow` envolvendo children.
- Sidebar: anéis CSS + “S”; mobile menu já tem `aria-label="Abrir menu"`.
- `NotificationBell`: icon-only sem nome acessível.
- Auth: `VibeAuthShell` injeta `/design-system/*.css`; `LoginView` classes `samps-signin-*`.
- Outros forms auth (`forgot-password`, etc.) já usam shadcn Card — só precisam do novo shell.
- `AnimatedThemeToggler`: VT sem checar reduced-motion (HIGH da interface-review).

---

### Task 1: Helper reduced-motion + wiring nos toggles (TDD)

**Files:**
- Create: `lib/theme/prefers-reduced-motion.ts`
- Create: `lib/theme/prefers-reduced-motion.test.ts`
- Modify: `components/ui/animated-theme-toggler.tsx`
- Modify: `lib/theme/view-transition.ts`

**Interfaces:**
- Produces:

```ts
/** Client-only. Returns true when the user prefers reduced motion. SSR → false. */
export function prefersReducedMotion(): boolean
```

Implementation:

```ts
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
```

- [ ] **Step 1: Branch**

```bash
git checkout master
git pull --ff-only
# Ensure #36 is merged; if not, base on feat/visual-foundation temporarily:
# git checkout -b feat/visual-shell feat/visual-foundation
git checkout -b feat/visual-shell
```

Worktree recommended: `.worktrees/feat-visual-shell`.

- [ ] **Step 2: Failing tests**

```ts
// lib/theme/prefers-reduced-motion.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { prefersReducedMotion } from "./prefers-reduced-motion";

describe("prefersReducedMotion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when window is undefined (SSR)", () => {
    const original = globalThis.window;
    // @ts-expect-error test SSR
    delete globalThis.window;
    expect(prefersReducedMotion()).toBe(false);
    globalThis.window = original;
  });

  it("returns true when matchMedia reduce matches", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: true, media: "(prefers-reduced-motion: reduce)" })
    );
    expect(prefersReducedMotion()).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith(
      "(prefers-reduced-motion: reduce)"
    );
  });

  it("returns false when matchMedia does not match", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: false, media: "(prefers-reduced-motion: reduce)" })
    );
    expect(prefersReducedMotion()).toBe(false);
  });
});
```

- [ ] **Step 3: RED** — `npx vitest run lib/theme/prefers-reduced-motion.test.ts` (módulo ausente)

- [ ] **Step 4: Implement helper + wire**

In `animated-theme-toggler.tsx` `toggleTheme`, **before** `startViewTransition`:

```ts
if (prefersReducedMotion() || typeof doc.startViewTransition !== "function") {
  applyTheme();
  return;
}
```

(Replace the existing early fallback that only checks `startViewTransition` — fold reduced-motion into the same path.)

In `lib/theme/view-transition.ts` `startThemeViewTransition`, at the top of the function body after computing nothing heavy:

```ts
import { prefersReducedMotion } from "@/lib/theme/prefers-reduced-motion";

// inside startThemeViewTransition, first lines of body:
if (prefersReducedMotion() || typeof document.startViewTransition !== "function") {
  apply();
  return;
}
```

(Adapt to existing control flow — goal: `apply()` runs immediately; no clip-path animation.)

- [ ] **Step 5: GREEN** — vitest pass; `npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add lib/theme/prefers-reduced-motion.ts lib/theme/prefers-reduced-motion.test.ts components/ui/animated-theme-toggler.tsx lib/theme/view-transition.ts
git commit -m "feat(theme): prefers-reduced-motion no toggle de tema"
```

---

### Task 2: Agency layout — remover caixa única

**Files:**
- Modify: `app/(agency)/layout.tsx`

**Interfaces:**
- Main content: `bg-background` (paper), **sem** `rounded-xl border shadow` wrapper.
- Banner + children ficam filhos diretos do `<main>` scrollable.

- [ ] **Step 1: Replace the main structure**

From:

```tsx
<main className="flex min-w-0 flex-1 flex-col overflow-hidden p-4 pt-14 sm:p-5 lg:pt-5">
  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
    <AnnouncementBanner ... />
    {children}
  </div>
</main>
```

To:

```tsx
<main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background pt-14 lg:pt-0">
  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
    <AnnouncementBanner
      announcements={announcements.map((a) => ({
        id: a.id,
        title: a.title,
        message: a.message,
        kind: a.kind,
      }))}
      birthdays={birthdays}
    />
    <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4 sm:p-5">
      {children}
    </div>
  </div>
</main>
```

Keep outer `flex h-dvh … bg-background` and sidebar + Toaster unchanged.

- [ ] **Step 2:** `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git commit -m "fix(agency): remove wrapper card do layout"
```

---

### Task 3: Sidebar SampsLogo + a11y do chrome

**Files:**
- Modify: `components/agency/agency-sidebar.tsx`
- Modify: `components/layout/notification-bell.tsx`

**Interfaces:**
- Header brand: `<SampsLogo />` (withWordmark default) no lugar dos anéis + “S” + título duplicado. Remover o bloco `relative flex h-9 w-9 …` inventado.
- Tagline pode ficar: `Diagnóstico + Planejamento + Método` em `text-xs text-muted-foreground`.
- Item ativo: manter accent sidebar; garantir ícone `text-primary` quando active (já existe).
- `NotificationBell`: nome acessível — `aria-label={count > 0 ? \`Notificações, ${count} não lidas\` : "Notificações"}` no `Link` (ou `sr-only` dentro do Link).
- Mobile trigger já tem `aria-label="Abrir menu"` e `size-10` — manter.
- Não alterar lista de rotas/permissões.

- [ ] **Step 1: Wire logo**

```tsx
import { SampsLogo } from "@/components/brand/samps-logo";

// inside header:
<div className="border-b border-border px-5 py-5">
  <SampsLogo />
  <p className="mt-3 text-xs text-muted-foreground">
    Diagnóstico + Planejamento + Método
  </p>
</div>
```

Remove the old mark + “Intranet” / “SAMPS Digital” h1 block (logo wordmark covers brand).

- [ ] **Step 2: NotificationBell**

```tsx
<Button variant="ghost" size="icon" asChild className="relative">
  <Link
    href="/notificacoes"
    aria-label={
      count > 0
        ? `Notificações, ${count} não lidas`
        : "Notificações"
    }
  >
    <Bell className="h-5 w-5" aria-hidden />
    ...
  </Link>
</Button>
```

- [ ] **Step 3:** `tsc` + `lint`

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(agency): SampsLogo no sidebar e nome no sino"
```

---

### Task 4: Auth shell Tailwind + LoginView

**Files:**
- Create: `components/auth/samps-auth-shell.tsx`
- Modify: `app/(auth)/layout.tsx`
- Modify: `components/auth/login-view.tsx`
- Delete: `components/auth/vibe-auth-shell.tsx` (após grep zero imports)
- Optional: stop loading vibe CSS for auth (no more link tags)

**Interfaces — SampsAuthShell:**

```tsx
"use client";
import { Providers } from "@/components/providers"; // or ThemeProvider+Session only
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export function SampsAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="relative min-h-dvh bg-background text-foreground">
        <div className="fixed right-4 top-4 z-50">
          <AnimatedThemeToggler className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground" />
        </div>
        {children}
      </div>
    </Providers>
  );
}
```

Note: `(auth)/layout` today wraps `SessionProvider` + Vibe. If `Providers` already has SessionProvider, **do not double-wrap** — use only `SampsAuthShell` with Providers, or shell without Session if layout keeps SessionProvider. Prefer: layout = `<SampsAuthShell>{children}</SampsAuthShell>` and shell includes ThemeProvider via `Providers` **or** thin ThemeProvider only if Session is in layout. Inspect `components/providers.tsx` — it has Session + Theme. Then auth layout should be **only** `SampsAuthShell` with Providers inside, **without** a second SessionProvider.

**Interfaces — LoginView:** rewrite to Tailwind tokens (no `samps-signin-*` / Vibe). Structure:

```
┌──────────────────┬──────────────────┐
│ SampsLogo        │  visual panel    │
│ Entrar           │  large SampsLogo │
│ form (Input,     │  or gradient bg  │
│  Button)         │  + short copy    │
│ footer tagline   │                  │
└──────────────────┴──────────────────┘
```

- Form panel: `bg-card` / `bg-background`, borders `border-border`.
- Inputs: use `@/components/ui/input`, `Label`, `Button`.
- Primary submit: class with gradient:

```tsx
className="w-full bg-gradient-to-r from-[hsl(var(--brand))] to-[hsl(var(--primary))] text-primary-foreground hover:opacity-95"
```

- Visual aside: `hidden md:flex`, background subtle gradient using brand/primary at low opacity; center `<SampsLogo withWordmark />` or mark-only large; copy from current visual panel (pt-BR).
- **No** infinite CSS pulse without reduced-motion; prefer static composition.
- Keep submit/error logic identical (`signIn`, `resolveLoginRedirect`).

- [ ] **Step 1: SampsAuthShell + auth layout**

- [ ] **Step 2: Rewrite LoginView**

- [ ] **Step 3: Grep**

```bash
rg "VibeAuthShell|vibe-auth-shell|samps-signin|/design-system/themes/samps-login" --glob "!docs/**" --glob "!public/design-system/**" --glob "!design-system/**"
```

Expect zero hits in app/components (public design-system preview OK).

- [ ] **Step 4: Delete `vibe-auth-shell.tsx` if unused**

- [ ] **Step 5: Gates** — tsc, lint, build

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(auth): shell Tailwind Samps e login unificado"
```

---

### Task 5: Smoke auth forms restantes + PR

**Files:** smoke-only unless a form still depends on Vibe classes.

- [ ] **Step 1:** Open `/forgot-password`, `/first-access` (if reachable) mentally via code — ensure they render inside new shell (shadcn Card centered). If a form is full-bleed ugly, wrap with `mx-auto flex min-h-dvh items-center justify-center p-6` in the page or form root — minimal change.

- [ ] **Step 2: Smoke checklist**

1. `/login` — logo, CTA gradiente, toggle tema com reduced-motion (DevTools emulate) aplica tema sem animação.
2. `/painel-gestao` — sem caixa arredondada envolvendo a página; sidebar com SampsLogo.
3. Sino anuncia “Notificações” no accessibility tree / aria-label.
4. Sem requests a `/design-system/index.css` nas rotas auth (Network).

- [ ] **Step 3: Push + PR**

```bash
git push -u origin HEAD
gh pr create --title "feat(shell): chrome Samps e auth Tailwind (etapa 1)" --body "## Summary
- Layout agency sem wrapper card
- Sidebar com SampsLogo; sino com aria-label
- Auth unificado em Tailwind; remove VibeAuthShell
- prefers-reduced-motion no theme toggle

## Depends on
- #36 fundação visual (tokens/logo)

## Spec
docs/superpowers/specs/2026-08-24-samps-os-visual-system-design.md (etapa 1)

## Test plan
- [ ] Login claro/escuro + reduced-motion
- [ ] Sidebar logo; layout flat
- [ ] Notificações nomeadas
- [ ] Sem CSS vibe nas rotas auth
- [ ] tsc / test / lint / build
"
```

- [ ] **Step 4:** Bugbot no PR. Merge só com CI verde + #36 mergeada.

---

## Spec coverage checklist (etapa 1)

| Requisito | Task |
|-----------|------|
| Sidebar logo câmera + wordmark | 3 |
| Main sem caixa única / paper | 2 |
| Auth Tailwind; sem Vibe produção | 4 |
| Login split + CTA Ember→Cyan | 4 |
| prefers-reduced-motion toggle | 1 |
| a11y ícones chrome (sino, menu) | 3 |
| Hit area mobile menu ≥40 | já `size-10` — verificar Task 3 |
| Fora: Kanban / portal / settings pages | — |

## Fora desta fatia

- Etapa 2 boards/cards/timer
- Etapa 3 gestão/settings visual
- Etapa 4 portal
- Deletar pasta `design-system/` / `public/design-system` (legado preview OK)

## Self-review (autor do plano)

1. Spec etapa 1 coberta.
2. Sem TBD.
3. `Providers` vs SessionProvider double-wrap called out in Task 4.
