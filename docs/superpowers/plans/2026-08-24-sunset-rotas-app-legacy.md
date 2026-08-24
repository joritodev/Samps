# Otimização de Revalidação — Sunset das Rotas (app) Legadas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduzir de 20 para 12 as chamadas `revalidatePath()` disparadas a cada mutação de demanda/timer, eliminando as 8 rotas legacy `(app)` da revalidação ao converter essas páginas em redirects permanentes para as equivalentes `(agency)`.

**Architecture:** As rotas `app/(app)/gestao`, `app/(app)/quadros/*` e `app/(app)/painel/*` renderizam os mesmos serviços que as rotas `app/(agency)/painel-gestao`, `app/(agency)/setores/*` e `app/(agency)/meu-painel/*`. A estratégia é: (1) adicionar redirects 308 em `next.config.mjs` para que navegadores e buscadores atualizem os bookmarks; (2) remover as 8 entradas legacy de `revalidateOperationalViews()`; (3) deletar os page.tsx agora mortos. Com redirects no nível do config, o Next.js não processa layout nem RSC para essas rotas — a revalidação é desnecessária.

**Tech Stack:** Next.js 14 App Router (redirects assíncronos em `next.config.mjs`), TypeScript, Vitest

## Global Constraints

- Next.js: `^14.2.35` — usar `async redirects()` conforme documentação 14.x
- Redirects: `permanent: true` (HTTP 308) — são aliases duradouros, não temporários
- Não alterar `app/(app)/calendario`, `app/(app)/relatorios`, `app/(app)/usuarios` — não estão no escopo desta fatia
- Não alterar `app/(app)/layout.tsx` — continua servindo as rotas fora do escopo
- `revalidateOperationalViews` deve manter a assinatura `(clientId?: string)` — é chamada em 9 arquivos
- Cada task deve terminar com `npm test` passando e `npm run build` OK
- Commits frequentes por task

---

## Mapeamento de redirects

| Rota legacy | Destino (agency) | Serviço |
|---|---|---|
| `/gestao` | `/painel-gestao` | `getManagementOverview` |
| `/quadros/design` | `/setores/design` | `getSectorBoardData("design")` |
| `/quadros/video` | `/setores/video` | `getSectorBoardData("video")` |
| `/quadros/trafego` | `/setores/trafego` | `getSectorBoardData("trafego")` |
| `/quadros/social-media` | `/setores/social` | `getSectorBoardData("social")` |
| `/painel/design` | `/meu-painel/design` | `getSectorBoardData("design", { assigneeId })` |
| `/painel/video` | `/meu-painel/video` | `getSectorBoardData("video", { assigneeId })` |
| `/painel/social-media` | `/meu-painel/social` | `getSectorBoardData("social", { assigneeId })` |
| `/painel/trafego` | `/meu-painel/trafego` | `getSectorBoardData("trafego", { assigneeId })` |

> Nota: `/painel/trafego` não está na lista de revalidação atual mas existe no filesystem — incluir no redirect por consistência.

---

## Task 1: Redirects permanentes em `next.config.mjs`

**Files:**
- Modify: `next.config.mjs`

**Interfaces:**
- Produces: as 9 rotas legacy retornam HTTP 308 apontando para os destinos listados acima

- [ ] **Step 1: Adicionar `async redirects()` ao objeto `nextConfig`**

Abra `next.config.mjs`. O objeto `nextConfig` está assim:

```js
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
```

Substitua por:

```js
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      // Painel de gestão
      { source: "/gestao", destination: "/painel-gestao", permanent: true },
      // Quadros de setor (visão geral)
      { source: "/quadros/design", destination: "/setores/design", permanent: true },
      { source: "/quadros/video", destination: "/setores/video", permanent: true },
      { source: "/quadros/trafego", destination: "/setores/trafego", permanent: true },
      { source: "/quadros/social-media", destination: "/setores/social", permanent: true },
      // Painéis pessoais dos colaboradores
      { source: "/painel/design", destination: "/meu-painel/design", permanent: true },
      { source: "/painel/video", destination: "/meu-painel/video", permanent: true },
      { source: "/painel/social-media", destination: "/meu-painel/social", permanent: true },
      { source: "/painel/trafego", destination: "/meu-painel/trafego", permanent: true },
    ];
  },
};
```

- [ ] **Step 2: Verificar TypeScript e build**

```bash
npx tsc --noEmit
npm run build
```

Esperado: sem erros de TypeScript; build bem-sucedido. O output do build deve mostrar as 9 rotas como redirects:

```
Redirects
┌ /gestao → /painel-gestao (308 Permanent Redirect)
┌ /quadros/design → /setores/design (308 Permanent Redirect)
...
```

- [ ] **Step 3: Rodar testes**

```bash
npm test
```

Esperado: 59/59 passando.

- [ ] **Step 4: Commit**

```bash
git add next.config.mjs
git commit -m "feat: redirects 308 para rotas (app) legadas → (agency)"
```

---

## Task 2: Remover legacy paths de `revalidateOperationalViews`

**Files:**
- Modify: `lib/revalidate-operational.ts`

**Interfaces:**
- Consumes: redirects de Task 1 já ativos — rotas legacy não precisam de invalidação de cache RSC
- Produces: `revalidateOperationalViews(clientId?)` com 12 chamadas (era 20)

- [ ] **Step 1: Escrever teste documentando o comportamento atual**

Crie `lib/revalidate-operational.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

// Mock next/cache antes de importar o módulo
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { revalidateOperationalViews } from "./revalidate-operational";

describe("revalidateOperationalViews", () => {
  it("chama revalidatePath para cada rota agency", () => {
    revalidateOperationalViews();

    const calls = (revalidatePath as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0]
    );

    // Agency (live shell)
    expect(calls).toContain("/setores");
    expect(calls).toContain("/setores/design");
    expect(calls).toContain("/setores/video");
    expect(calls).toContain("/setores/trafego");
    expect(calls).toContain("/setores/social");
    expect(calls).toContain("/meu-painel/design");
    expect(calls).toContain("/meu-painel/video");
    expect(calls).toContain("/meu-painel/trafego");
    expect(calls).toContain("/meu-painel/social");
    expect(calls).toContain("/painel-gestao");
    expect(calls).toContain("/demandas");
    expect(calls).toContain("/notificacoes");

    // Rotas legacy NÃO devem mais estar presentes
    expect(calls).not.toContain("/quadros/design");
    expect(calls).not.toContain("/quadros/video");
    expect(calls).not.toContain("/quadros/trafego");
    expect(calls).not.toContain("/quadros/social-media");
    expect(calls).not.toContain("/painel/design");
    expect(calls).not.toContain("/painel/video");
    expect(calls).not.toContain("/painel/social-media");
    expect(calls).not.toContain("/gestao");
  });

  it("revalida o quadro do cliente quando clientId é fornecido", () => {
    vi.clearAllMocks();
    revalidateOperationalViews("client-123");

    const calls = (revalidatePath as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0]
    );
    expect(calls).toContain("/clientes/client-123/quadro");
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar que falha (estado atual)**

```bash
npm test -- revalidate-operational
```

Esperado: FAIL — o teste `not.toContain` falha porque as rotas legacy ainda estão lá.

- [ ] **Step 3: Remover as 8 entradas legacy de `lib/revalidate-operational.ts`**

Substitua o conteúdo do arquivo por:

```typescript
import { revalidatePath } from "next/cache";

/** Agency operational views após mutações de demanda/assignment/timer. */
export function revalidateOperationalViews(clientId?: string) {
  // Agency (live shell) — (agency) route group
  revalidatePath("/setores");
  revalidatePath("/setores/design");
  revalidatePath("/setores/video");
  revalidatePath("/setores/trafego");
  revalidatePath("/setores/social");
  revalidatePath("/meu-painel/design");
  revalidatePath("/meu-painel/video");
  revalidatePath("/meu-painel/trafego");
  revalidatePath("/meu-painel/social");
  revalidatePath("/painel-gestao");
  revalidatePath("/demandas");
  revalidatePath("/notificacoes");

  if (clientId) {
    revalidatePath(`/clientes/${clientId}/quadro`);
  }
}
```

- [ ] **Step 4: Rodar os testes**

```bash
npm test
```

Esperado: 60/60 passando (novo teste incluído).

- [ ] **Step 5: Commit**

```bash
git add lib/revalidate-operational.ts lib/revalidate-operational.test.ts
git commit -m "perf: remove rotas (app) legacy de revalidateOperationalViews"
```

---

## Task 3: Deletar os page.tsx redundantes do grupo (app)

**Files:**
- Delete: `app/(app)/gestao/page.tsx`
- Delete: `app/(app)/quadros/design/page.tsx`
- Delete: `app/(app)/quadros/video/page.tsx`
- Delete: `app/(app)/quadros/trafego/page.tsx`
- Delete: `app/(app)/quadros/social-media/page.tsx`
- Delete: `app/(app)/painel/design/page.tsx`
- Delete: `app/(app)/painel/video/page.tsx`
- Delete: `app/(app)/painel/social-media/page.tsx`
- Delete: `app/(app)/painel/trafego/page.tsx` (se existir)

**Interfaces:**
- Consumes: redirects de Task 1 já ativos — as rotas nunca chegam ao page.tsx

> Nota: apenas os `page.tsx` são deletados. Os diretórios e eventuais subpastas são mantidos se tiverem outros conteúdos. `app/(app)/layout.tsx` não é tocado — ainda serve `calendario`, `relatorios`, `usuarios`.

- [ ] **Step 1: Deletar os arquivos**

```bash
rm app/\(app\)/gestao/page.tsx
rm app/\(app\)/quadros/design/page.tsx
rm app/\(app\)/quadros/video/page.tsx
rm app/\(app\)/quadros/trafego/page.tsx
rm app/\(app\)/quadros/social-media/page.tsx
rm app/\(app\)/painel/design/page.tsx
rm app/\(app\)/painel/video/page.tsx
rm app/\(app\)/painel/social-media/page.tsx
```

Verificar se `/painel/trafego/page.tsx` existe antes de deletar:

```bash
ls app/\(app\)/painel/trafego/
```

Se existir `page.tsx`, deletar também.

- [ ] **Step 2: Verificar TypeScript e build**

```bash
npx tsc --noEmit
npm run build
```

Esperado: build OK, sem referências quebradas.

- [ ] **Step 3: Rodar testes**

```bash
npm test
```

Esperado: 60/60 passando.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove page.tsx das rotas (app) legacy substituídas por redirects"
```

---

## Task 4: PR, revisão final e merge

**Files:**
- No code changes

- [ ] **Step 1: Criar PR**

```bash
git push -u origin <branch-name>
gh pr create --title "perf: sunset rotas (app) legacy — revalidação cai de 20 para 12 paths" --body-file <body-file>
```

Corpo do PR:

```markdown
## Motivação

Cada mutação de demanda/timer disparava `revalidatePath()` em 20 rotas.
8 dessas rotas são aliases da versão (agency) do app e nunca precisaram
de invalidação independente — os mesmos dados já são revalidados pelas
rotas (agency).

## O que mudou

- `next.config.mjs`: 9 redirects 308 para as rotas legacy → agency
- `lib/revalidate-operational.ts`: removidas as 8 entradas legacy
- `app/(app)/gestao/page.tsx` e 8 outros page.tsx: deletados (dead code)
- Novo teste: `lib/revalidate-operational.test.ts` documenta o contrato

## Impacto

- Revalidações por mutação: 20 → 12 (−40%)
- Usuários com bookmarks antigos: recebem 308 e atualizam automaticamente
- Nenhuma mudança de comportamento para rotas (agency) ativas

## Verificação

- `npm test` — 60/60 passando
- `npm run build` — sem erros
- Vercel preview: checar que `/quadros/design` redireciona para `/setores/design`
```

- [ ] **Step 2: Verificar checks CI**

Aguardar o CI do PR. Esperado:
- `verify` (CI): SUCCESS
- `secrets` (Security): SUCCESS
- `audit` (Security): SUCCESS (DATABASE_URL agora configurado após PR #34)

- [ ] **Step 3: Merge**

```bash
gh pr merge <pr-number> --squash --delete-branch
git checkout master && git pull
```

---

## Self-Review do Plano

**1. Spec coverage:**
- Redirects para todas as 9 rotas legacy: Task 1 ✓
- Remoção das 8 entradas de revalidação: Task 2 ✓
- Deleção do código morto: Task 3 ✓
- Teste documentando o contrato: Task 2 ✓
- PR com contexto: Task 4 ✓

**2. Placeholder scan:** Nenhum "TBD" ou "TODO" encontrado. Todos os steps têm código completo.

**3. Type consistency:** Assinatura `revalidateOperationalViews(clientId?: string)` usada igual em todos os passos. Nome do arquivo de teste segue padrão `*.test.ts` do projeto (vitest).
