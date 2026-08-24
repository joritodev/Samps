# Etapa 0 — Fundação visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uma identidade Samps no CSS/tokens do app inteiro — Ink/Paper/Surface/Cyan/Ember/Line, dark calibrado, sem 7 accents, logo SVG da câmera, `error`/`not-found` com recuperação — sem remodelar páginas.

**Architecture:** Tokens HSL canônicos em `lib/theme/tokens.ts` (fonte única testável). `app/globals.css` e `tailwind.config.ts` consomem os mesmos papéis shadcn (`background`/`foreground`/`primary`/`brand`/`border`/`ring`) mapeados para a marca. Remover `data-color-theme` + `ColorThemeProvider`. Página Temas fica só claro/escuro. Logo em `components/brand/samps-logo.tsx` (consumidores na etapa 1).

**Tech Stack:** Next.js 14 App Router, Tailwind, shadcn/ui, Vitest, next-themes (light/dark only).

**Spec:** `docs/superpowers/specs/2026-08-24-samps-os-visual-system-design.md` (§4 identidade, §5.4 estados, §6 etapa 0)

## Global Constraints

- Sem schema Prisma, auth, RLS ou mudança de regra de negócio.
- Não remodelar sidebar, Kanban, portal ou auth shell nesta fatia (etapa 1+).
- Remover accents `royal|violet|pink|lavender|sky|coral|teal`; **manter** toggle claro/escuro.
- Primary = Cyan; brand/ember = Ember; não usar Ember como `destructive`.
- Gradiente Ember→Cyan só no SVG do logo nesta etapa (CTA hero é etapa 1).
- Piso tipográfico: documentar + regra base; não varrer todos os `text-[10px]` (etapa 2).
- Branch: `feat/visual-foundation` a partir de `master` atualizado.
- Conventional Commits em português; 1 commit por task.
- Gates: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`.

## File map

| Arquivo | Responsabilidade |
|---------|------------------|
| `lib/theme/tokens.ts` | Valores HSL nomeados + mapeamento shadcn |
| `lib/theme/tokens.test.ts` | Vitest: chaves e formato `H S% L%` |
| `app/globals.css` | `:root` / `.dark` a partir dos tokens; sem `data-color-theme` |
| `tailwind.config.ts` | Cores existentes; garantir `brand` / sem novos accents |
| `lib/theme/colors.ts` | Deletar ou reduzir a stub vazio — preferir **deletar** |
| `components/theme/color-theme-provider.tsx` | **Deletar** |
| `components/providers.tsx` | Remover `ColorThemeProvider` |
| `app/layout.tsx` | Remover script `samps-color-theme` / `data-color-theme` |
| `components/agency/themes-settings.tsx` | Só seção Aparência (claro/escuro) |
| `components/agency/settings-hub.tsx` | Label/descrição “Aparência” |
| `components/brand/samps-logo.tsx` | SVG câmera + wordmark opcional |
| `app/error.tsx` | Erro com “Tentar de novo” |
| `app/not-found.tsx` | 404 com “Voltar ao painel” |

## Estado atual (não reinventar)

- Tokens em `app/globals.css` (royal/coral + 7 themes).
- Accent: `lib/theme/colors.ts` + `ColorThemeProvider` + script no `app/layout.tsx`.
- Temas UI: `components/agency/themes-settings.tsx` (cor + aparência).
- Light/dark: `next-themes` em `components/providers.tsx` + `AnimatedThemeToggler`.
- Sem `app/error.tsx` / `app/not-found.tsx`.
- Sem asset de logo em `public/`.

---

### Task 1: Tokens canônicos (TDD)

**Files:**
- Create: `lib/theme/tokens.ts`
- Create: `lib/theme/tokens.test.ts`

**Interfaces:**
- Produces:

```ts
/** Space-separated HSL channels without `hsl()` — shadcn style: "H S% L%" */
export type HslChannels = string;

export const sampsBrand = {
  ink: "220 48% 8%",       // #0B1220
  paper: "220 20% 97%",    // #F7F8FA
  surface: "0 0% 100%",    // #FFFFFF
  cyan: "188 63% 48%",     // #2EB5C9
  ember: "21 68% 62%",     // #E08A5C
  line: "218 24% 88%",     // #D8DEE8
} as const;

export const sampsBrandDark = {
  ink: "210 40% 98%",
  paper: "220 28% 7%",
  surface: "220 24% 10%",
  cyan: "188 70% 55%",
  ember: "21 75% 65%",
  line: "220 14% 20%",
} as const;

/** Maps to CSS variables consumed by Tailwind/shadcn */
export const lightSemantic = {
  background: sampsBrand.paper,
  foreground: sampsBrand.ink,
  card: sampsBrand.surface,
  "card-foreground": sampsBrand.ink,
  primary: sampsBrand.cyan,
  "primary-foreground": "0 0% 100%",
  brand: sampsBrand.ember,
  "brand-foreground": "0 0% 100%",
  border: sampsBrand.line,
  input: sampsBrand.line,
  ring: sampsBrand.cyan,
  muted: "220 16% 94%",
  "muted-foreground": "220 12% 40%",
  secondary: "220 16% 94%",
  "secondary-foreground": sampsBrand.ink,
  accent: "220 16% 94%",
  "accent-foreground": sampsBrand.ink,
  destructive: "0 72% 51%",
  "destructive-foreground": "0 0% 100%",
  success: "142 71% 36%",
  warning: "32 95% 44%",
} as const;

export const darkSemantic = {
  background: sampsBrandDark.paper,
  foreground: sampsBrandDark.ink,
  card: sampsBrandDark.surface,
  "card-foreground": sampsBrandDark.ink,
  primary: sampsBrandDark.cyan,
  "primary-foreground": "220 28% 8%",
  brand: sampsBrandDark.ember,
  "brand-foreground": "0 0% 100%",
  border: sampsBrandDark.line,
  input: sampsBrandDark.line,
  ring: sampsBrandDark.cyan,
  muted: "220 16% 16%",
  "muted-foreground": "220 12% 65%",
  secondary: "220 16% 16%",
  "secondary-foreground": sampsBrandDark.ink,
  accent: "220 16% 16%",
  "accent-foreground": sampsBrandDark.ink,
  destructive: "0 62% 45%",
  "destructive-foreground": "0 0% 100%",
  success: "142 60% 45%",
  warning: "32 90% 55%",
} as const;
```

- [ ] **Step 1: Branch**

```bash
git checkout master
git pull --ff-only
git checkout -b feat/visual-foundation
```

Se `master` local estiver atrás e o commit da spec (`docs/superpowers/specs/2026-08-24-samps-os-visual-system-design.md`) só existir em outra branch, cherry-pick ou mergear esse arquivo antes de começar código.

- [ ] **Step 2: Write failing tests**

```ts
// lib/theme/tokens.test.ts
import { describe, expect, it } from "vitest";
import {
  darkSemantic,
  lightSemantic,
  sampsBrand,
  sampsBrandDark,
} from "./tokens";

const HSL_RE = /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/;

describe("sampsBrand", () => {
  it("exposes the six named brand channels", () => {
    expect(Object.keys(sampsBrand).sort()).toEqual(
      ["cyan", "ember", "ink", "line", "paper", "surface"].sort()
    );
  });

  it("uses shadcn HSL channel format", () => {
    for (const value of Object.values(sampsBrand)) {
      expect(value).toMatch(HSL_RE);
    }
    for (const value of Object.values(sampsBrandDark)) {
      expect(value).toMatch(HSL_RE);
    }
  });
});

describe("semantic maps", () => {
  it("maps primary to cyan and brand to ember in light", () => {
    expect(lightSemantic.primary).toBe(sampsBrand.cyan);
    expect(lightSemantic.brand).toBe(sampsBrand.ember);
    expect(lightSemantic.background).toBe(sampsBrand.paper);
    expect(lightSemantic.foreground).toBe(sampsBrand.ink);
  });

  it("keeps destructive distinct from ember", () => {
    expect(lightSemantic.destructive).not.toBe(sampsBrand.ember);
    expect(darkSemantic.destructive).not.toBe(sampsBrandDark.ember);
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

```bash
npx vitest run lib/theme/tokens.test.ts
```

Expected: FAIL (módulo inexistente)

- [ ] **Step 4: Implement `lib/theme/tokens.ts`** com o conteúdo da seção Interfaces acima.

- [ ] **Step 5: Run — expect PASS**

```bash
npx vitest run lib/theme/tokens.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add lib/theme/tokens.ts lib/theme/tokens.test.ts
git commit -m "feat(theme): tokens canonicos Ink Paper Cyan Ember"
```

---

### Task 2: Aplicar tokens em `globals.css` e limpar accents CSS

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts` (só se faltar `success`/`warning` ou comentário; manter `brand`)

**Interfaces:**
- Consumes: valores de `lightSemantic` / `darkSemantic` (copiar os literais HSL para o CSS — o CSS não importa TS em runtime; os números devem **bater** com `tokens.ts`)
- Produces: app herda Cyan como `--primary`, Ember como `--brand`, sem blocos `[data-color-theme=…]`

- [ ] **Step 1: Substituir bloco `:root` e `.dark`**

Em `app/globals.css`, dentro de `@layer base`:

1. Reescrever `:root { … }` usando os canais de `lightSemantic` (+ sidebar derivados de cyan/paper/line):

```css
:root {
  --background: 220 20% 97%;
  --foreground: 220 48% 8%;
  --card: 0 0% 100%;
  --card-foreground: 220 48% 8%;
  --popover: 0 0% 100%;
  --popover-foreground: 220 48% 8%;
  --primary: 188 63% 48%;
  --primary-foreground: 0 0% 100%;
  --secondary: 220 16% 94%;
  --secondary-foreground: 220 48% 8%;
  --muted: 220 16% 94%;
  --muted-foreground: 220 12% 40%;
  --accent: 220 16% 94%;
  --accent-foreground: 220 48% 8%;
  --brand: 21 68% 62%;
  --brand-foreground: 0 0% 100%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;
  --border: 218 24% 88%;
  --input: 218 24% 88%;
  --ring: 188 63% 48%;
  --chart-1: 188 63% 48%;
  --chart-2: 21 68% 62%;
  --chart-3: 220 14% 28%;
  --chart-4: 220 10% 55%;
  --chart-5: 0 72% 51%;
  --radius: 0.625rem;
  --sidebar: 0 0% 100%;
  --sidebar-foreground: 220 12% 40%;
  --sidebar-primary: 188 63% 48%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 188 55% 95%;
  --sidebar-accent-foreground: 188 63% 32%;
  --sidebar-border: 218 24% 88%;
  --sidebar-ring: 188 63% 48%;
  --teal-light: 188 55% 40%;
  --success: 142 71% 36%;
  --success-foreground: 142 76% 97%;
  --warning: 32 95% 44%;
  --info: 188 63% 45%;
}
```

2. Reescrever `.dark { … }` com `darkSemantic` (+ sidebar dark). Incluir `--success`, `--warning`, `--info`, `--teal-light`, `--chart-*` no bloco dark (hoje vários vazam do light).

3. **Apagar** todos os seletores `:root[data-color-theme=…]`, `[data-color-theme=…]` e `.dark[data-color-theme=…]` (linhas ~96–237 do arquivo atual).

4. Manter `body` / `h1–h3` / scrollbars / view-transition Magic UI.

5. Adicionar comentário no topo do `@layer base` dos tokens:

```css
/* Samps brand — fonte: lib/theme/tokens.ts (manter em sync) */
```

- [ ] **Step 2: Verificar `tailwind.config.ts`**

Confirmar que existem `brand`, `success`, `teal-light`. Não adicionar ramps `violet` etc. Se `--warning` / `--info` não estiverem no Tailwind e não forem usados, não é obrigatório mapear nesta fatia (spec: tokens não usados podem sair depois; aqui só garantir dark redefine `--warning` no CSS).

- [ ] **Step 3: Gates rápidos**

```bash
npx tsc --noEmit
npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add app/globals.css tailwind.config.ts
git commit -m "feat(theme): aplicar tokens Samps e remover accents CSS"
```

---

### Task 3: Remover runtime de accent + Temas só aparência

**Files:**
- Delete: `lib/theme/colors.ts`
- Delete: `components/theme/color-theme-provider.tsx`
- Modify: `components/providers.tsx`
- Modify: `app/layout.tsx`
- Modify: `components/agency/themes-settings.tsx`
- Modify: `components/agency/settings-hub.tsx` (label/descrição)
- Grep e corrigir qualquer import restante de `@/lib/theme/colors` ou `useColorTheme`

**Interfaces:**
- Consumes: `useTheme` de `next-themes` apenas
- Produces: nenhum `data-color-theme` no DOM; `/configuracoes/temas` só claro/escuro

- [ ] **Step 1: Grep**

```bash
rg "useColorTheme|COLOR_THEMES|ColorThemeProvider|samps-color-theme|data-color-theme|lib/theme/colors" --glob "!docs/**" --glob "!.agents/**"
```

Listar hits; todos devem ser eliminados nesta task.

- [ ] **Step 2: `providers.tsx`**

```tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
```

- [ ] **Step 3: `app/layout.tsx`**

Remover o `<script dangerouslySetInnerHTML=…samps-color-theme…>` do `<head>`. Manter fonts e `lang="pt-BR"`.

- [ ] **Step 4: Reescrever `themes-settings.tsx`**

Remover import/`useColorTheme`/`COLOR_THEMES` e a seção “Cor do tema”. Manter “Aparência” (claro/escuro) + `startThemeViewTransition`. Atualizar copy:

- Título: `Aparência`
- Descrição: `Escolha o modo claro ou escuro.`
- Remover menção a “cor escolhida” no parágrafo da aparência.

- [ ] **Step 5: `settings-hub.tsx`**

Onde `href: "/configuracoes/temas"`: `label: "Aparência"` e descrição curta sem “cor principal” (ajustar o campo de descrição existente no hub).

- [ ] **Step 6: Deletar** `lib/theme/colors.ts` e `components/theme/color-theme-provider.tsx`.

- [ ] **Step 7: Gates**

```bash
npx tsc --noEmit
npx vitest run lib/theme/tokens.test.ts
npm run lint
```

Expected: limpo; nenhum import órfão.

- [ ] **Step 8: Commit**

```bash
git add -A components/providers.tsx app/layout.tsx components/agency/themes-settings.tsx components/agency/settings-hub.tsx
git add -u lib/theme/colors.ts components/theme/color-theme-provider.tsx
git commit -m "refactor(theme): remover accents; temas so claro/escuro"
```

---

### Task 4: Logo SVG Samps

**Files:**
- Create: `components/brand/samps-logo.tsx`

**Interfaces:**
- Produces:

```tsx
export type SampsLogoProps = {
  className?: string;
  /** Show wordmark SAMPS / DIGITAL beside the mark. Default true. */
  withWordmark?: boolean;
  /** Accessible name. Default "Samps Digital". */
  title?: string;
};

export function SampsLogo({
  className,
  withWordmark = true,
  title = "Samps Digital",
}: SampsLogoProps): JSX.Element
```

- Mark: câmera em stroke com `stroke="url(#samps-cam-gradient)"` — stops Ember `#E08A5C` → Cyan `#2EB5C9`.
- Wordmark: “SAMPS” em `font-display` bold; “DIGITAL” em caps tracking largo `text-xs` muted. O A do SVG do mark pode ser geométrico; o texto HTML usa “A” normal (spec §4.2).
- `aria-hidden` no SVG decorativo se houver wordmark visível; senão `role="img"` + `<title>`.

- [ ] **Step 1: Implementar componente**

SVG simplificado da câmera (corpo retangular arredondado + lente circular + viewfinder), viewBox `0 0 48 48`, tamanho default `h-8 w-8` no mark.

Exemplo de estrutura (ajustar paths para parecer câmera):

```tsx
// components/brand/samps-logo.tsx
import { cn } from "@/lib/utils";

export function SampsLogo({
  className,
  withWordmark = true,
  title = "Samps Digital",
}: {
  className?: string;
  withWordmark?: boolean;
  title?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 48 48"
        className="h-8 w-8 shrink-0"
        aria-hidden={withWordmark ? true : undefined}
        role={withWordmark ? undefined : "img"}
      >
        {!withWordmark ? <title>{title}</title> : null}
        <defs>
          <linearGradient id="samps-cam-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E08A5C" />
            <stop offset="100%" stopColor="#2EB5C9" />
          </linearGradient>
        </defs>
        <rect
          x="6"
          y="14"
          width="36"
          height="26"
          rx="6"
          fill="none"
          stroke="url(#samps-cam-gradient)"
          strokeWidth="2.5"
        />
        <circle
          cx="24"
          cy="27"
          r="8"
          fill="none"
          stroke="url(#samps-cam-gradient)"
          strokeWidth="2.5"
        />
        <circle
          cx="24"
          cy="27"
          r="3"
          fill="none"
          stroke="url(#samps-cam-gradient)"
          strokeWidth="2"
        />
        <path
          d="M16 14 V10 H32 V14"
          fill="none"
          stroke="url(#samps-cam-gradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      {withWordmark ? (
        <span className="flex flex-col leading-none">
          <span className="font-display text-base font-bold tracking-tight text-foreground">
            SAMPS
          </span>
          <span className="text-[10px] font-medium tracking-[0.28em] text-muted-foreground">
            DIGITAL
          </span>
        </span>
      ) : null}
    </span>
  );
}
```

Nota: o `text-[10px]` no wordmark DIGITAL é exceção deliberada de marca (caps espaçadas); não espalhar para UI.

Se IDs de gradiente colidirem com múltiplas instâncias na página, usar `useId()` do React para sufixar o id do gradient.

- [ ] **Step 2: Smoke estático**

Importar temporariamente só para typecheck — ou adicionar export e confiar no tsc. Não wire no sidebar nesta task.

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/brand/samps-logo.tsx
git commit -m "feat(brand): logo SVG camera com gradiente Ember-Cyan"
```

---

### Task 5: `error.tsx` e `not-found.tsx`

**Files:**
- Create: `app/error.tsx`
- Create: `app/not-found.tsx`

**Interfaces:**
- `error.tsx` — Client Component (`"use client"`) com props `{ error: Error & { digest?: string }; reset: () => void }`
- Copy (pt-BR, tom neutro, sem “oops”):
  - Título: `Não foi possível carregar esta página`
  - Corpo: `Verifique a conexão e tente de novo. Se o problema continuar, fale com a gestão.`
  - Botão primário: `Tentar de novo` → `reset()`
  - Link secundário: `Voltar ao painel` → `/painel-gestao`
- `not-found.tsx` — Server Component:
  - Título: `Página não encontrada`
  - Corpo: `O endereço não existe ou você não tem acesso.`
  - Link: `Voltar ao painel` → `/painel-gestao`
- Usar `Button` de `@/components/ui/button` e classes de token (`bg-background`, `text-foreground`). Layout simples centralizado `min-h-dvh`.

- [ ] **Step 1: Implementar os dois arquivos**

```tsx
// app/error.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        Não foi possível carregar esta página
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Verifique a conexão e tente de novo. Se o problema continuar, fale com a
        gestão.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset}>
          Tentar de novo
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/painel-gestao">Voltar ao painel</Link>
        </Button>
      </div>
    </div>
  );
}
```

```tsx
// app/not-found.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        Página não encontrada
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        O endereço não existe ou você não tem acesso.
      </p>
      <Button asChild>
        <Link href="/painel-gestao">Voltar ao painel</Link>
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Gates**

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Expected: build OK.

- [ ] **Step 3: Commit**

```bash
git add app/error.tsx app/not-found.tsx
git commit -m "feat(ui): paginas error e not-found com recuperacao"
```

---

### Task 6: PR + smoke visual

- [ ] **Step 1: Smoke manual**

1. `npm run dev` → login e `/painel-gestao` em claro: primary ciano, não royal; botões `brand` em ember.
2. Alternar dark no menu / `/configuracoes/temas`: só claro/escuro; **sem** swatches de cor.
3. Confirmar DevTools: `<html>` **sem** `data-color-theme`.
4. Forçar 404 (`/rota-inexistente-xyz`) → copy da spec + link.
5. (Opcional) jogar erro em dev para ver `error.tsx`.

- [ ] **Step 2: Push + PR**

```bash
git push -u origin HEAD
gh pr create --title "feat(theme): fundacao visual Samps (etapa 0)" --body "## Summary
- Tokens Ink/Paper/Cyan/Ember/Line; dark calibrado
- Remove 7 accents + ColorThemeProvider; Temas = aparência
- Logo SVG Samps; error/not-found com recuperação

## Spec
docs/superpowers/specs/2026-08-24-samps-os-visual-system-design.md (etapa 0)

## Test plan
- [ ] Claro/escuro sem seletor de accent
- [ ] Primary ciano / brand ember
- [ ] Sem data-color-theme no DOM
- [ ] /rota-inexistente mostra not-found
- [ ] tsc / lint / test / build verdes
"
```

- [ ] **Step 3:** Bugbot no PR (UI + tema). Security Review **não** obrigatório (sem auth/RLS/PII).

- [ ] **Step 4:** Merge só com CI verde.

---

## Spec coverage checklist (etapa 0)

| Requisito spec | Task |
|----------------|------|
| Tokens ink/paper/surface/cyan/ember/line | 1, 2 |
| Dark calibrado (incl. success/warning) | 2 |
| Remover 7 accents + UI de cor | 2, 3 |
| Manter claro/escuro | 3 |
| Logo SVG câmera Ember→Cyan | 4 |
| error / not-found com recuperação | 5 |
| Sem remodelar páginas / shell / kanban | — (fora) |
| Sem schema/auth/RLS | — (fora) |

## Fora desta fatia (etapas 1–4)

- Wire logo no sidebar/login; unificar auth fora do Vibe
- Remover wrapper card do layout agency; a11y do chrome
- Demand cards / Kanban / tabular-nums
- Gestão / settings polish
- Portal

## Self-review (autor do plano)

1. **Spec coverage:** etapa 0 coberta; tipografia piso `text-xs` nos cartões fica na etapa 2 (explicitado em Global Constraints).
2. **Placeholders:** nenhum TBD.
3. **Types:** `SampsLogoProps` e maps `lightSemantic`/`darkSemantic` consistentes entre tasks.
