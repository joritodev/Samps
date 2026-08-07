# Fase 1 — Segurança e hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam checkbox (`- [ ]`).
>
> **Playbook (obrigatório):** `docs/superpowers/plans/2026-08-07-playbook-metodologia.md` — matriz seção 5 Fase 1.
> **Retomar em:** Task 3 (`sec/rate-limit-login`). Tasks 1–2 já mergeadas.

**Goal:** Deixar o sistema pronto para o time da Samps testar em produção sem risco de vazamento: dependência sem CVE, headers de segurança, rate limit no login, URL protegida, CI com verificação de segredos e RLS comprovado.

**Architecture:** Nenhum módulo novo de domínio. Camadas afetadas: configuração do Next (headers), auth (rate limit), infraestrutura (Vercel + GitHub Actions) e testes (Vitest como base para as fases seguintes). O modelo de permissões e o RLS existentes são mantidos e passam a ser verificados por script e por teste.

**Tech Stack:** Next.js 14, NextAuth v5, Prisma 6, PostgreSQL (Neon), GitHub Actions, Vitest, TruffleHog.

## Metodologia desta fase

| Task | Motor | Modelo | Review | Estado (2026-08-07) |
|------|-------|--------|--------|---------------------|
| 1 CVE Next | EP/SDD | Opus (audit) + grok | nota deps | mergeada (#17) |
| 2 Headers CSP | SDD/EP | grok-fast | — | mergeada (#18) |
| **3 Rate limit** | **SDD** | **Opus controller**; implementer mid/forte | **Security Review** | **PRÓXIMA** |
| 4 Acesso teste | DIR + DOC (+ humano Vercel) | Auto | nota | pendente |
| 5 CI workflows | SDD/EP | grok-fast | Bugbot leve | pendente |
| 6 Vitest | SDD + TDD | grok-fast / mid | Bugbot | pendente |
| 7 check-rls | SDD | Opus | **Security Review** | pendente |
| 8 Gate fase | Security + Bugbot + DOC | Opus | nota seguranca | pendente |

**Regras:** uma branch/PR por task; não iniciar Fase 2 sem critério de saída abaixo; Task 4 exige ação humana no painel Vercel — o agent só documenta o que puder verificar.
## Global Constraints

- Segredos vivem **somente** em `.env` local e nas Environment Variables da Vercel. Nunca em código, commit, log, PR ou issue.
- `PRISMA_LOG_QUERIES` nunca habilitado em produção.
- Mensagem de erro de login é sempre genérica: nunca revelar se o e-mail existe.
- Nenhuma tarefa desta fase pode afrouxar permissão ou RLS existente.
- Um commit por tarefa, com `npx tsc --noEmit` limpo.
- Depende da Fase 0 concluída (`master` verde, stashes vazios).

---

## File map

| Arquivo | Responsabilidade | Tarefa |
|---------|------------------|--------|
| `package.json` / `package-lock.json` | versão corrigida do Next e deps | 1 |
| `docs/superpowers/notas/2026-08-dependencias.md` | registro do audit e da política | 1 |
| `next.config.mjs` | headers de segurança e CSP | 2 |
| `lib/auth/rate-limit.ts` | política de tentativas de login | 3 |
| `lib/auth/credentials.ts` | aplicar rate limit e registrar IP | 3 |
| `lib/auth.ts` | extrair IP da request e repassar | 3 |
| `docs/superpowers/notas/2026-08-acesso-teste.md` | como o time acessa, o que é dado real | 4 |
| `.github/workflows/ci.yml` | tipos, lint, build | 5 |
| `.github/workflows/security.yml` | varredura de segredos e audit | 5 |
| `vitest.config.ts` | runner de testes | 6 |
| `lib/agency/contract-services.test.ts` | teste de `normalizeScopeLines` | 6 |
| `lib/agency/labels.test.ts` | teste das regras de status | 6 |
| `lib/auth/rate-limit.test.ts` | teste do limite de tentativas | 6 |
| `lib/permissions/resolve.test.ts` | teste de `hasPermission` e `canAccessClient` | 6 |
| `scripts/check-rls.ts` | ampliar cobertura de verificação | 7 |
| `docs/superpowers/notas/2026-08-seguranca.md` | resultado do Security Review e pendências | 8 |

---

### Task 1: Eliminar a CVE do Next e fixar política de dependências

O build da Vercel avisa: `next@14.2.15: This version has a security vulnerability`.

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `docs/superpowers/notas/2026-08-dependencias.md`

**Interfaces:**
- Consumes: `master` verde da Fase 0
- Produces: `next` em patch sem CVE conhecida; nota com o padrão de atualização

- [ ] **Step 1: Branch**

```bash
git checkout master
git pull --ff-only
git checkout -b sec/dependencias-next-cve
```

- [ ] **Step 2: Levantar o cenário real (não assumir versão)**

```bash
npm audit --audit-level=moderate
npm view next dist-tags
npm view next versions --json | Select-String -Pattern "14\.2\."
```

Anote: a maior versão `14.2.x` publicada e o que o `npm audit` aponta.

- [ ] **Step 3: Atualizar dentro do major 14**

```bash
npm install next@^14.2 eslint-config-next@^14.2
```

Ficar no major 14 evita quebra de App Router nesta fase. Migração para o major seguinte é decisão separada, registrada na nota do Step 7.

- [ ] **Step 4: Reinstalar e verificar**

```bash
npm audit --audit-level=high
npx tsc --noEmit
npm run lint
npm run build
```

Esperado: `npm audit` sem `high`/`critical` em dependência de produção; build passa.

- [ ] **Step 5: Smoke manual**

```bash
npm run dev
```

Login, `/painel-gestao`, abrir um cartão, `/agenda`, `/configuracoes`, alternar tema.

Esperado: nenhuma tela em branco nem erro de runtime no console do servidor.

- [ ] **Step 6: Se sobrar vulnerabilidade sem patch em 14.x**

Não forçar `npm audit fix --force`. Registrar na nota (Step 7) qual é, o vetor, se é dependência de dev ou de produção, e propor o upgrade de major como tarefa da Fase 3.

- [ ] **Step 7: Escrever a nota de dependências**

`docs/superpowers/notas/2026-08-dependencias.md`:

```markdown
# Dependências — política e estado (ago/2026)

## Estado
- next: <versão instalada> (antes: 14.2.15, com CVE)
- npm audit high/critical em produção: <nenhum | lista>
- pendências sem patch em 14.x: <nenhuma | lista com vetor>

## Política
- `npm audit --audit-level=high` roda no CI a cada PR.
- Upgrade de patch/minor de segurança: aplicar na semana.
- Upgrade de major: só com tarefa própria, plano e smoke completo.
- Nunca usar `npm audit fix --force` sem plano.
```

- [ ] **Step 8: Commit e PR**

```bash
git add package.json package-lock.json docs/superpowers/notas/2026-08-dependencias.md
git commit -m "sec(deps): atualizar next para patch sem CVE e registrar politica de dependencias"
git push -u origin HEAD
gh pr create --title "sec(deps): corrigir CVE do Next" --body "Sobe o Next para o ultimo patch 14.2.x, roda npm audit e registra a politica de atualizacao em docs/superpowers/notas/2026-08-dependencias.md.

Teste: npm audit --audit-level=high, npm run build, smoke em painel-gestao/cartao/agenda/configuracoes."
```

---

### Task 2: Headers de segurança e CSP em modo report

**Files:**
- Modify: `next.config.mjs`

**Interfaces:**
- Consumes: nada
- Produces: `headers()` no config do Next aplicando as políticas em todas as rotas

- [ ] **Step 1: Branch**

```bash
git checkout master
git pull --ff-only
git checkout -b sec/headers-csp
```

- [ ] **Step 2: Substituir o conteúdo de `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */

// CSP entra em Report-Only nesta fase: o app usa estilos inline do Tailwind/shadcn
// e scripts do Next, então bloquear de primeira quebraria telas. Depois de checar
// os relatórios, a Fase 3 troca para Content-Security-Policy sem "-Report-Only".
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
];

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
```

- [ ] **Step 3: Verificar tipos e build**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 4: Conferir os headers servidos**

```bash
npm run start
```

Em outro terminal:

```bash
curl.exe -sI http://localhost:3000/login | Select-String -Pattern "X-Frame-Options|X-Content-Type-Options|Referrer-Policy|Permissions-Policy|Content-Security-Policy-Report-Only"
```

Esperado: as cinco linhas presentes. `Strict-Transport-Security` pode não aparecer em HTTP local; confira depois em produção.

- [ ] **Step 5: Smoke visual**

Abrir `/login`, `/painel-gestao`, um cartão com sheet aberto e `/agenda`.

Esperado: layout intacto e console do navegador sem erro de CSP bloqueando (violações em Report-Only aparecem como aviso, o que é esperado).

- [ ] **Step 6: Commit e PR**

```bash
git add next.config.mjs
git commit -m "sec(headers): aplicar headers de seguranca e CSP em report-only"
git push -u origin HEAD
gh pr create --title "sec(headers): headers de seguranca" --body "Adiciona X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS e CSP em Report-Only, e desliga o header x-powered-by.

CSP fica em Report-Only nesta fase para nao quebrar estilos inline; virar enforce e tarefa da Fase 3.

Teste: curl -I em /login conferindo os headers e smoke visual em login/painel/cartao/agenda."
```

---

### Task 3: Rate limit no login

Hoje cada tentativa falha só gera `AccessAttemptLog`; nada impede força bruta.

**Files:**
- Create: `lib/auth/rate-limit.ts`
- Modify: `lib/auth/credentials.ts`
- Modify: `lib/auth.ts`

**Interfaces:**
- Consumes: modelo `AccessAttemptLog` (`email`, `ipAddress`, `success`, `reason`, `createdAt`)
- Produces:
  - `LOGIN_MAX_ATTEMPTS: number`, `LOGIN_WINDOW_MINUTES: number`
  - `exceedsAttemptLimit(attempts: number, limit?: number): boolean`
  - `isLoginBlocked(email: string, ipAddress?: string | null): Promise<boolean>`
  - `validateCredentials(email: string, password: string, ipAddress?: string | null)`

- [ ] **Step 1: Branch**

```bash
git checkout master
git pull --ff-only
git checkout -b sec/rate-limit-login
```

- [ ] **Step 2: Criar `lib/auth/rate-limit.ts`**

```ts
import { db } from "@/lib/db";

export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_WINDOW_MINUTES = 15;

/** Regra pura, para poder testar sem banco. */
export function exceedsAttemptLimit(
  attempts: number,
  limit: number = LOGIN_MAX_ATTEMPTS
) {
  return attempts >= limit;
}

function windowStart() {
  return new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000);
}

/**
 * Bloqueia por e-mail e, quando disponível, por IP. A checagem é feita antes de
 * comparar a senha, então nem o bcrypt roda em rajada de tentativas.
 */
export async function isLoginBlocked(
  email: string,
  ipAddress?: string | null
) {
  const since = windowStart();
  const normalized = email.toLowerCase().trim();

  const [byEmail, byIp] = await Promise.all([
    db.accessAttemptLog.count({
      where: { email: normalized, success: false, createdAt: { gte: since } },
    }),
    ipAddress
      ? db.accessAttemptLog.count({
          where: { ipAddress, success: false, createdAt: { gte: since } },
        })
      : Promise.resolve(0),
  ]);

  return (
    exceedsAttemptLimit(byEmail) ||
    exceedsAttemptLimit(byIp, LOGIN_MAX_ATTEMPTS * 4)
  );
}
```

- [ ] **Step 3: Aplicar em `lib/auth/credentials.ts`**

Trocar a assinatura e adicionar a checagem antes de qualquer consulta de usuário:

```ts
export async function validateCredentials(
  email: string,
  password: string,
  ipAddress?: string | null
) {
  const normalized = email.toLowerCase().trim();

  if (await isLoginBlocked(normalized, ipAddress)) {
    await db.accessAttemptLog.create({
      data: {
        email: normalized,
        ipAddress: ipAddress ?? null,
        success: false,
        reason: "rate_limited",
      },
    });
    return null;
  }

  const user = await db.user.findUnique({
    where: { email: normalized },
    include: { role: true, sector: true },
  });
  // ... resto do fluxo existente
}
```

Importar no topo:

```ts
import { isLoginBlocked } from "@/lib/auth/rate-limit";
```

E incluir `ipAddress: ipAddress ?? null` em **todos** os `db.accessAttemptLog.create` já existentes deste arquivo.

- [ ] **Step 4: Repassar o IP em `lib/auth.ts`**

```ts
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;
        const forwarded = request?.headers?.get("x-forwarded-for") ?? null;
        const ipAddress = forwarded ? forwarded.split(",")[0].trim() : null;
        return validateCredentials(
          String(credentials.email),
          String(credentials.password),
          ipAddress
        );
      },
```

- [ ] **Step 5: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: exit 0.

- [ ] **Step 6: Smoke manual**

```bash
npm run dev
```

1. Em `/login`, errar a senha de `gestao@samps.digital` 5 vezes
2. Na 6ª tentativa, usar a senha **correta** (`Samps@2026`)

Esperado: a 6ª também é recusada, com a mesma mensagem genérica. Depois de 15 minutos (ou apagando as linhas de `AccessAttemptLog` daquele e-mail) o login volta a funcionar.

- [ ] **Step 7: Confirmar que a mensagem não vaza informação**

Tentar login com e-mail inexistente e com e-mail válido e senha errada.

Esperado: mensagem idêntica nos dois casos.

- [ ] **Step 8: Commit e PR**

```bash
git add lib/auth/rate-limit.ts lib/auth/credentials.ts lib/auth.ts
git commit -m "sec(auth): limitar tentativas de login por email e ip"
git push -u origin HEAD
gh pr create --title "sec(auth): rate limit no login" --body "Bloqueia login apos 5 falhas por email em 15 minutos (e 20 por IP), usando o AccessAttemptLog que ja existia. A checagem roda antes do bcrypt e registra a tentativa com reason=rate_limited. Mensagem de erro segue generica.

Teste: errar a senha 5x e confirmar que a 6a tentativa com senha correta e recusada."
```

- [ ] **Step 9: Gate**

Rodar o subagente **Security Review** com `Diff: branch changes` nesta branch antes do merge.

---

### Task 4: Proteger o acesso de teste e isolar dado real

Hoje `https://samps-os.vercel.app` é público e aponta para o mesmo banco de desenvolvimento.

**Files:**
- Create: `docs/superpowers/notas/2026-08-acesso-teste.md`

**Interfaces:**
- Consumes: projeto Vercel `samps-os` já linkado
- Produces: URL protegida + instrução de acesso para o time da Samps

- [ ] **Step 1: Ativar Deployment Protection**

No painel: `Vercel → samps-os → Settings → Deployment Protection`. Ativar proteção para **Preview** e, enquanto for ambiente de teste, também para **Production** (Password Protection ou Vercel Authentication com convidados).

- [ ] **Step 2: Confirmar que a proteção está de pé**

```bash
curl.exe -s -o NUL -w "%{http_code}" https://samps-os.vercel.app/login
```

Esperado: `401` (ou redirect para a tela de proteção da Vercel), não `200`.

- [ ] **Step 3: Decidir o banco do ambiente de teste**

Se houver qualquer dado de cliente real no banco atual, criar um branch/instância separada no Neon para o teste e apontar `DATABASE_URL` de Production para ela, rodando `npm run db:seed` para popular com dados de demonstração. Se o banco atual já é só demonstração, registrar isso explicitamente na nota do Step 6.

- [ ] **Step 4: Forçar troca de senha no primeiro acesso**

Para cada usuário criado para o time da Samps, garantir `mustResetPassword = true`. O fluxo `/first-access` já existe e é obrigatório pelo middleware.

- [ ] **Step 5: Confirmar que `PRISMA_LOG_QUERIES` não existe em Production**

No painel de Environment Variables da Vercel, a variável não deve estar definida em Production.

- [ ] **Step 6: Escrever a nota de acesso**

`docs/superpowers/notas/2026-08-acesso-teste.md`:

```markdown
# Acesso de teste — Samps (ago/2026)

- URL: https://samps-os.vercel.app
- Proteção: Vercel Deployment Protection ativa (Production + Preview)
- Banco: <demonstração | instância separada de teste>
- Dados: <somente seed de demonstração | descrever o que é real>
- Usuários de teste: criados pela gestão em /equipe, com troca de senha no primeiro acesso
- Regras para o time: não subir arquivo de cliente real durante o teste; reportar bug em <canal combinado>
- PRISMA_LOG_QUERIES: ausente em Production
```

- [ ] **Step 7: Commit**

```bash
git checkout -b chore/acesso-teste
git add docs/superpowers/notas/2026-08-acesso-teste.md
git commit -m "docs(seguranca): registrar acesso protegido de teste e isolamento de dados"
git push -u origin HEAD
gh pr create --title "docs(seguranca): acesso de teste" --body "Registra a protecao do ambiente de teste, o banco usado e as regras para o time da Samps durante os testes de usabilidade."
```

---

### Task 5: CI com verificação de tipos, lint, build e segredos

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/security.yml`

**Interfaces:**
- Consumes: scripts `lint`, `build` do `package.json`
- Produces: dois workflows rodando em cada PR para `master`

- [ ] **Step 1: Branch**

```bash
git checkout master
git pull --ff-only
git checkout -b chore/ci-seguranca
```

- [ ] **Step 2: Criar `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
    branches: [master]
  push:
    branches: [master]

jobs:
  verify:
    runs-on: ubuntu-latest
    env:
      # URL falsa: o build usa rotas dinâmicas e não conecta no banco.
      DATABASE_URL: postgresql://ci:ci@localhost:5432/ci?schema=public
      AUTH_SECRET: ci-secret-not-used-in-runtime
      NEXTAUTH_URL: http://localhost:3000
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Typecheck
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build
```

- [ ] **Step 3: Criar `.github/workflows/security.yml`**

```yaml
name: Security

on:
  pull_request:
    branches: [master]
  schedule:
    - cron: "0 9 * * 1"

jobs:
  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Scan de segredos
        uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified

  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: npm audit (producao)
        run: npm audit --omit=dev --audit-level=high
```

- [ ] **Step 4: Validar os comandos localmente antes de confiar no CI**

```bash
npx tsc --noEmit
npm run lint
npm run build
npm audit --omit=dev --audit-level=high
```

Esperado: todos passam. Se o `npm audit` falhar, resolver na Task 1 antes de mergear este workflow.

- [ ] **Step 5: Commit e PR**

```bash
git add .github/workflows/ci.yml .github/workflows/security.yml
git commit -m "chore(ci): adicionar pipeline de verificacao e varredura de segredos"
git push -u origin HEAD
gh pr create --title "chore(ci): CI e seguranca" --body "Adiciona workflow de CI (tsc, lint, build) e workflow de seguranca (TruffleHog para segredos verificados + npm audit de producao, semanal e por PR).

Teste: conferir os dois checks verdes neste proprio PR."
```

- [ ] **Step 6: Tornar os checks obrigatórios**

Em `GitHub → Settings → Branches → master`, marcar `verify`, `secrets` e `audit` como required status checks.

---

### Task 6: Vitest e primeiros testes de unidade

Sem runner, as fases seguintes não conseguem seguir TDD. Aqui entra o mínimo útil.

**Files:**
- Modify: `package.json` (devDependency + script `test`)
- Create: `vitest.config.ts`
- Create: `lib/agency/contract-services.test.ts`
- Create: `lib/agency/labels.test.ts`
- Create: `lib/auth/rate-limit.test.ts`
- Create: `lib/permissions/resolve.test.ts`
- Modify: `.github/workflows/ci.yml` (rodar os testes)

**Interfaces:**
- Consumes: `normalizeScopeLines`, `canDemandBriefing`, `canCompleteProduction`, `exceedsAttemptLimit`, `hasPermission`, `canAccessClient`
- Produces: `npm test` executável local e no CI

- [ ] **Step 1: Branch e dependências**

```bash
git checkout master
git pull --ff-only
git checkout -b chore/vitest-base
npm install -D vitest
```

- [ ] **Step 2: Criar `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: Adicionar o script em `package.json`**

```json
"test": "vitest run",
```

- [ ] **Step 4: Escrever os testes que devem falhar se a regra mudar**

`lib/agency/labels.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  canCompleteProduction,
  canDemandBriefing,
  canRegisterPublication,
  canRequestAdjustment,
} from "./labels";

describe("regras de acao por status", () => {
  it("permite demandar somente em planejamento", () => {
    expect(canDemandBriefing("PLANNING")).toBe(true);
    expect(canDemandBriefing("PENDING_PLANNING")).toBe(true);
    expect(canDemandBriefing("IN_PRODUCTION")).toBe(false);
    expect(canDemandBriefing("DONE")).toBe(false);
  });

  it("bloqueia demandar quando o briefing esta travado", () => {
    expect(canDemandBriefing("PLANNING", new Date())).toBe(false);
  });

  it("libera producao apenas em producao ou ajuste", () => {
    expect(canCompleteProduction("IN_PRODUCTION")).toBe(true);
    expect(canCompleteProduction("ADJUSTMENTS")).toBe(true);
    expect(canCompleteProduction("IN_REVIEW")).toBe(false);
  });

  it("libera ajuste apenas em revisao", () => {
    expect(canRequestAdjustment("IN_REVIEW")).toBe(true);
    expect(canRequestAdjustment("IN_PRODUCTION")).toBe(false);
  });

  it("libera publicacao em aprovado, agendado e revisao", () => {
    expect(canRegisterPublication("APPROVED")).toBe(true);
    expect(canRegisterPublication("SCHEDULED")).toBe(true);
    expect(canRegisterPublication("IN_REVIEW")).toBe(true);
    expect(canRegisterPublication("PLANNING")).toBe(false);
  });
});
```

`lib/agency/contract-services.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  demandTypeFromContentSlug,
  normalizeScopeLines,
  periodicitySuffix,
} from "./contract-services";

describe("normalizeScopeLines", () => {
  it("descarta linhas com quantidade menor que 1", () => {
    const out = normalizeScopeLines([
      { contentTypeId: "a", quantity: 0, periodicity: "monthly" },
      { contentTypeId: "b", quantity: 8, periodicity: "monthly" },
    ]);
    expect(out).toEqual([
      { contentTypeId: "b", quantity: 8, periodicity: "monthly" },
    ]);
  });

  it("descarta linha sem tipo de conteudo", () => {
    expect(
      normalizeScopeLines([
        { contentTypeId: "", quantity: 5, periodicity: "monthly" },
      ])
    ).toEqual([]);
  });

  it("cai para monthly quando a periodicidade e invalida", () => {
    const [line] = normalizeScopeLines([
      { contentTypeId: "a", quantity: 2, periodicity: "qualquer" },
    ]);
    expect(line.periodicity).toBe("monthly");
  });
});

describe("mapeamento de tipo de demanda", () => {
  it("mapeia slugs conhecidos", () => {
    expect(demandTypeFromContentSlug("stories")).toBe("STORY");
    expect(demandTypeFromContentSlug("reels")).toBe("REEL");
    expect(demandTypeFromContentSlug("carrossel")).toBe("FEED");
    expect(demandTypeFromContentSlug("motion")).toBe("VIDEO");
    expect(demandTypeFromContentSlug("inexistente")).toBe("OTHER");
  });
});

describe("periodicitySuffix", () => {
  it("formata os sufixos exibidos na ficha", () => {
    expect(periodicitySuffix("monthly")).toBe(" / mês");
    expect(periodicitySuffix("weekly")).toBe(" / semana");
    expect(periodicitySuffix("one_shot")).toBe(" (pacote)");
  });
});
```

`lib/auth/rate-limit.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { exceedsAttemptLimit, LOGIN_MAX_ATTEMPTS } from "./rate-limit";

describe("exceedsAttemptLimit", () => {
  it("libera abaixo do limite", () => {
    expect(exceedsAttemptLimit(LOGIN_MAX_ATTEMPTS - 1)).toBe(false);
  });

  it("bloqueia no limite e acima", () => {
    expect(exceedsAttemptLimit(LOGIN_MAX_ATTEMPTS)).toBe(true);
    expect(exceedsAttemptLimit(LOGIN_MAX_ATTEMPTS + 3)).toBe(true);
  });

  it("aceita limite customizado", () => {
    expect(exceedsAttemptLimit(10, 20)).toBe(false);
  });
});
```

`lib/permissions/resolve.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { canAccessClient, hasPermission } from "./resolve";

describe("hasPermission", () => {
  it("reconhece a permissao presente", () => {
    expect(hasPermission(["clients.edit"], "clients.edit")).toBe(true);
  });

  it("nega quando a permissao nao esta na lista", () => {
    expect(hasPermission(["clients.view_all"], "clients.edit")).toBe(false);
  });
});

describe("canAccessClient", () => {
  it("permite quem tem visao global", () => {
    expect(canAccessClient(["clients.view_all"], [], "c1")).toBe(true);
  });

  it("permite apenas os clientes vinculados", () => {
    expect(canAccessClient([], ["c1"], "c1")).toBe(true);
    expect(canAccessClient([], ["c1"], "c2")).toBe(false);
  });
});
```

- [ ] **Step 5: Rodar os testes**

```bash
npm test
```

Esperado: todos passam. Se algum falhar, a regra real difere do teste: **não** ajuste o teste para passar sem entender; confirme qual é o comportamento correto (as regras válidas estão na Fase 0, Task 3) e corrija o lado errado.

Se as assinaturas de `hasPermission`/`canAccessClient` forem diferentes das usadas acima, ajuste a chamada no teste para a assinatura real do arquivo `lib/permissions/resolve.ts` mantendo os mesmos casos cobertos.

- [ ] **Step 6: Rodar os testes no CI**

Em `.github/workflows/ci.yml`, depois do passo `Lint`:

```yaml
      - name: Testes
        run: npm test
```

- [ ] **Step 7: Commit e PR**

```bash
git add package.json package-lock.json vitest.config.ts lib/agency/labels.test.ts lib/agency/contract-services.test.ts lib/auth/rate-limit.test.ts lib/permissions/resolve.test.ts .github/workflows/ci.yml
git commit -m "chore(test): adicionar vitest e cobrir regras de status, escopo e rate limit"
git push -u origin HEAD
gh pr create --title "chore(test): base de testes com Vitest" --body "Adiciona Vitest e testes de unidade para as regras de acao por status, normalizacao do escopo de contrato, limite de tentativas de login e checagem de permissao. Passa a rodar npm test no CI.

Teste: npm test local."
```

---

### Task 7: Comprovar o recorte por cliente (RLS)

O RLS existe (`prisma/migrations/20260727153000_rls_app_role`) e há `scripts/check-rls.ts`. Falta rodar como rotina e cobrir o portal.

**Files:**
- Modify: `scripts/check-rls.ts`
- Create: `docs/superpowers/notas/2026-08-rls.md`

**Interfaces:**
- Consumes: `withUserScope(userId, fn)` de `lib/db.ts`
- Produces: `npm run check:rls` com saída afirmando ausência de vazamento

- [ ] **Step 1: Branch e execução do que já existe**

```bash
git checkout master
git pull --ff-only
git checkout -b sec/verificar-rls
npm run check:rls
```

Esperado: cliente externo vê apenas as demandas dos clientes vinculados; nenhuma linha estrangeira.

- [ ] **Step 2: Ampliar a verificação**

Acrescentar ao script, no mesmo padrão do que já existe, checagens que falham (saem com código diferente de zero) se houver vazamento em:

- `tx.client.findMany()` sob escopo do cliente externo → só os clientes vinculados
- `tx.comment.findMany()` sob escopo do cliente externo → nenhum comentário interno
- `tx.workSession.findMany()` sob escopo do cliente externo → nenhuma sessão de trabalho
- `tx.attachment.findMany()` sob escopo do cliente externo → só anexos de demanda visível

Para cada uma, imprimir `OK` ou `VAZAMENTO` e, no final, `process.exit(1)` se houver qualquer vazamento.

- [ ] **Step 3: Rodar de novo**

```bash
npm run check:rls
```

Esperado: todas as linhas `OK` e exit 0.

- [ ] **Step 4: Smoke pelo produto**

Login `cliente@samps.digital` e tentar acessar `/painel-gestao`, `/clientes` e `/demandas` pela URL.

Esperado: redirecionado para `/portal` em todos os casos.

- [ ] **Step 5: Registrar o resultado**

`docs/superpowers/notas/2026-08-rls.md` com data, o que foi verificado, o resultado e a instrução de rodar `npm run check:rls` antes de cada release.

- [ ] **Step 6: Commit e PR**

```bash
git add scripts/check-rls.ts docs/superpowers/notas/2026-08-rls.md
git commit -m "sec(rls): ampliar verificacao de recorte por cliente"
git push -u origin HEAD
gh pr create --title "sec(rls): verificacao de recorte" --body "Amplia scripts/check-rls.ts para cobrir clientes, comentarios, sessoes de trabalho e anexos sob escopo de cliente externo, saindo com erro se houver vazamento. Registra o resultado em docs/superpowers/notas/2026-08-rls.md.

Teste: npm run check:rls e tentar acessar rotas internas logado como cliente externo."
```

---

### Task 8: Gate de segurança da fase

**Files:**
- Create: `docs/superpowers/notas/2026-08-seguranca.md`

**Interfaces:**
- Consumes: tarefas 1–7 mergeadas
- Produces: relatório com pendências classificadas

- [ ] **Step 1: Rodar o Security Review sobre o conjunto**

Dispachar o subagente **Security Review** com `Diff: branch changes` a partir de uma branch de comparação com o `master` anterior à fase (ou revisar os PRs desta fase em conjunto).

- [ ] **Step 2: Rodar o Bugbot**

Subagente **Bugbot**, `Diff: branch changes`, para pegar regressão funcional introduzida pelo hardening.

- [ ] **Step 3: Classificar os achados**

`docs/superpowers/notas/2026-08-seguranca.md`:

```markdown
# Revisão de segurança — Fase 1 (ago/2026)

| Achado | Severidade | Decisão | Onde tratar |
|--------|-----------|---------|-------------|
| ... | crítica/alta/média/baixa | corrigir agora / próxima fase / aceitar risco | ... |

## Corrigido nesta fase
- CVE do Next
- Headers e CSP (report-only)
- Rate limit de login
- Ambiente de teste protegido
- CI com varredura de segredos
- RLS verificado por script

## Pendências aceitas até setembro
- CSP em enforce (Fase 3)
- <demais itens>
```

- [ ] **Step 4: Corrigir o que for crítico ou alto antes de seguir**

Cada correção vira commit próprio na branch `sec/<assunto>` com PR.

- [ ] **Step 5: Commit**

```bash
git checkout -b docs/seguranca-fase1
git add docs/superpowers/notas/2026-08-seguranca.md
git commit -m "docs(seguranca): registrar revisao e pendencias da fase 1"
git push -u origin HEAD
gh pr create --title "docs(seguranca): revisao da fase 1" --body "Consolida os achados do Security Review e do Bugbot da fase de hardening, com severidade e decisao de cada item."
```

---

## Critério de saída da Fase 1

1. `npm audit --omit=dev --audit-level=high` sem achado
2. Headers de segurança servidos em produção
3. Login bloqueando após 5 falhas
4. `https://samps-os.vercel.app` exigindo proteção da Vercel
5. CI verde e obrigatório em PR (`verify`, `secrets`, `audit`)
6. `npm test` rodando local e no CI
7. `npm run check:rls` saindo `OK` em todas as verificações
8. `docs/superpowers/notas/2026-08-seguranca.md` sem pendência crítica ou alta em aberto
