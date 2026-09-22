# Samps OS

Sistema operacional da [Samps Digital](https://sampsdigital.com.br) — o dia a dia da agência (demanda, briefing, produção, revisão, portal do cliente) cabe aqui.

Não é CRM white-label, não é Trello e não é produto para vender em 2026. É a ferramenta interna da Samps: contrato gera cartão, briefing trava, cronômetro mede produção, Drive registra entrega, portal mostra o que a equipe libera.

**Produção:** [samps-os.vercel.app](https://samps-os.vercel.app)

[![CI](https://github.com/joritodev/Samps/actions/workflows/ci.yml/badge.svg)](https://github.com/joritodev/Samps/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=nextdotjs)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest)](https://vitest.dev/)

---

## Índice

- [O que o sistema faz](#o-que-o-sistema-faz)
- [O que não é](#o-que-não-é)
- [Stack](#stack)
- [Começar em 5 minutos](#começar-em-5-minutos)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Scripts](#scripts)
- [Arquitetura](#arquitetura)
- [Ciclo da demanda](#ciclo-da-demanda)
- [Papéis](#papéis)
- [Banco, seed e dados de teste](#banco-seed-e-dados-de-teste)
- [Qualidade e gates](#qualidade-e-gates)
- [Segurança](#segurança)
- [Documentação](#documentação)
- [Como contribuir](#como-contribuir)
- [Estado e fila](#estado-e-fila)

---

## O que o sistema faz

| Superfície | Para quem | O que acontece |
|------------|-----------|----------------|
| **Agência** (`app/(agency)`) | Time interno | Quadros por cliente e setor, demandas, briefing, cronômetro, agenda, captações, projetos, performance, equipe, configurações |
| **Portal** (`app/(portal)`) | Cliente externo | Entregas, publicações, calendário e arquivos **liberados** — nunca mural, aniversário, endereço interno ou cronômetro |
| **Auth** (`app/(auth)`) | Todos | Login, convite, primeiro acesso, recuperação de senha |

Fluxos que o time já opera:

- Criar demanda → concluir briefing → assumir no setor → produzir (com timer) → revisão → ajuste ou aprovar → publicar
- Quadros de cliente com colunas livres (status Prisma continua sendo a lei; coluna é visual)
- Checklist tipo Trello no cartão: listas nomeadas, item leve; atribuir responsável cria demanda-filha no Meu Painel
- Meu Painel por cargo (social, design, vídeo, tráfego)
- Relatórios em `/performance` (resumo, por pessoa, por tipo, CSV)
- Menções `@` em comentários, com notificação
- Mural de avisos e registro de ausências
- Impersonação “ver como cliente” (gestão/admin)

---

## O que não é

Até o operacional de setembro estar em uso real, **fora de escopo**:

- Multi-tenant / SaaS vendável
- Chat em tempo real (substitui WhatsApp operacional com comentário + menção)
- Upload binário de arquivo (hoje o anexo é **link** de Drive/Figma)
- App nativo ou PWA em loja
- Assistente de IA em produção
- Rewrite de API em NestJS + JWT Bearer

Decisões documentadas em `docs/superpowers/notas/` (IA, mobile, SaaS).

---

## Stack

| Camada | Escolha |
|--------|---------|
| App | Next.js 14 (App Router) + React 18 + TypeScript estrito |
| Dados | Prisma 6 + PostgreSQL ([Neon](https://neon.tech), URL do **pooler**) |
| Auth | NextAuth v5 (Credentials + JWT, sessão 7 dias) |
| UI | Tailwind + shadcn/Radix, tokens da marca Samps (`ink` / `cyan` / `ember`) |
| Forms / validação | react-hook-form + Zod |
| Testes | Vitest (`lib/**/*.test.ts`, `components/**/*.test.tsx`) |
| E-mail | Resend (sem chave → o link cai no console, em dev) |
| Deploy | Vercel — Production em [samps-os.vercel.app](https://samps-os.vercel.app) |
| Node | **20** (o mesmo do CI) |

Backend continua no Next.js (Server Actions + `lib/services/*`). Isolamento é por **cliente da Samps** (RLS), não por agência compradora.

---

## Começar em 5 minutos

Pré-requisitos: Node 20, npm, e um Postgres (Neon de desenvolvimento).

```bash
git clone https://github.com/joritodev/Samps.git
cd Samps
npm ci
cp .env.example .env
```

Preencha `DATABASE_URL` (connection string do **pooler** Neon, região próxima) e `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

Aplique o schema, gere o Prisma Client e suba o seed de demonstração:

```bash
npx prisma migrate deploy
npm run db:generate
npm run db:seed
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) — o root redireciona para `/login`.

> **`db:seed` apaga o banco.** Só rode em instância de desenvolvimento. Em produção compartilhada, use `npx tsx scripts/prepare-test-demo-data.ts` (enriquece sem wipe).

### Contas do seed (somente local / demo)

A senha padrão está em `DEFAULT_PASSWORD` em `prisma/seed.ts`. Não use essas contas com dado de cliente real; troque as senhas **antes** de qualquer go-live.

| E-mail | Papel | Entra em |
|--------|-------|----------|
| `gestao@samps.digital` | Gestão | `/painel-gestao` |
| `social@samps.digital` | Social Media | `/meu-painel/social` |
| `designer@samps.digital` | Designer | `/meu-painel/design` |
| `videomaker@samps.digital` / `editor@samps.digital` | Vídeo | `/meu-painel/video` |
| `trafego@samps.digital` | Tráfego | `/meu-painel/trafego` |
| `admin@samps.digital` | Admin | `/painel-gestao` |
| `cliente@samps.digital` | Cliente externo | `/portal` (demo Bella Clinic) |

Roteiro curto: criar demanda → briefing → assumir → material (link) → revisão → publicar.

---

## Variáveis de ambiente

Fonte: `.env.example`. **Nunca** commitar `.env`, `.env.*`, `.vercel/` ou dumps.

| Variável | Obrigatória | Função |
|----------|-------------|--------|
| `DATABASE_URL` | sim | Postgres Neon (preferir pooler) |
| `AUTH_SECRET` | sim | Assinatura da sessão NextAuth |
| `NEXTAUTH_URL` | sim em prod | URL canônica (`http://localhost:3000` em dev) |
| `RESEND_API_KEY` | não | Convites e reset de senha; sem ela, o fluxo loga o link no terminal |
| `RESEND_FROM_EMAIL` | não | Default `noreply@samps.digital` |
| `PRISMA_LOG_QUERIES` | não | `1` loga todo SQL — **ausente em Production** |

---

## Scripts

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Next.js em desenvolvimento |
| `npm run build` / `npm start` | Build de produção e servidor |
| `npm run lint` | ESLint (`next lint`) |
| `npm test` | Vitest uma vez (`vitest run`) |
| `npx tsc --noEmit` | Typecheck (gate de toda fatia) |
| `npm run db:generate` | `prisma generate` |
| `npm run db:migrate` | `prisma migrate dev` (desenvolvimento) |
| `npx prisma migrate deploy` | Aplica migrations (CI / Production) |
| `npm run db:seed` | Wipe + seed de demonstração |
| `npm run db:studio` | Prisma Studio |
| `npm run db:push` | `prisma db push` — não usar no fluxo normal de fatia |
| `npm run check:rls` | Recorte RLS com usuário `cliente@` (precisa de `DATABASE_URL` migrado) |
| `npx tsx scripts/prepare-test-demo-data.ts` | Enriquece demo **sem** apagar o banco |
| `npx tsx scripts/smoke-roles.ts` | Smoke dos 8 cargos + regras de ciclo |

`postinstall` já roda `prisma generate`.

---

## Arquitetura

```text
                    ┌────────────┐
   browser ────────►│  Next.js   │
                    │  App Router│
                    └─────┬──────┘
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
     (auth)          (agency)         (portal)
     login           operação          cliente
     convite         interna           externo
                     │
                     ▼
              Server Actions
              app/actions/*
                     │
                     ▼
              lib/services/*
              (regras de ciclo,
               RLS via withUserScope)
                     │
                     ▼
              Prisma + Neon
              policies RLS
```

| Pasta | Responsabilidade |
|-------|------------------|
| `app/(agency)/` | Shell canônico do time — **feature nova só aqui** |
| `app/(portal)/` | Portal do cliente |
| `app/(auth)/` | Login e fluxos de conta |
| `app/actions/` | Server Actions finas (Zod na borda) |
| `lib/services/` | Regras de negócio (a UI e o servidor usam as mesmas) |
| `lib/agency/demand-cycle.ts` | Status Prisma → coluna / o que cada ação pode fazer |
| `lib/permissions/` | Códigos, resolução de papel + override |
| `lib/auth/` | Credenciais, rate limit, redirects |
| `components/agency/` `components/board/` | UI operacional |
| `prisma/` | Schema, migrations, seed |
| `scripts/` | RLS, smoke, prepare-demo |
| `docs/superpowers/` | Roadmap, playbook, specs, notas |

Middleware (`middleware.ts`) usa só `auth.config.ts` (Edge): Prisma e bcrypt ficam em `lib/auth.ts`.

Cliente externo que bate em rota interna vai para `/portal`. Interno sem `portal.view_as_client` não entra no portal.

---

## Ciclo da demanda

O **status Prisma** é a lei. A coluna do quadro é visual; personalizar lista não inventa etapa.

```text
A planejar  →  Demandada  →  Em produção  →  Em revisão
                  ▲                               │
                  └──── ajuste solicitado ◄───────┤
                                                  ▼
                                            Aprovada → Publicada
```

Regras que o servidor e a UI compartilham (`canDemandBriefing`, `canCompleteProduction`, `canRequestAdjustment`, `canRegisterPublication`):

- Briefing incompleto não demanda o setor
- Concluir produção só em `IN_PRODUCTION`, com link do material
- Ajuste ou aprovação só em `IN_REVIEW` (revisor ≠ executor)
- Publicar só em `APPROVED` / `SCHEDULED` — não a partir de `IN_REVIEW`
- Entrega para relatório = `productionCompletedAt` no período, não “qualquer DONE”

KPI de produtividade ≠ publicação. Publicação é outra métrica.

---

## Papéis

Permissões saem do papel (`Role`) + overrides por usuário. Gestão reconfigura em `/configuracoes/funcoes`.

| Tipo (`UserType`) | Papel seed | Recorte típico |
|-------------------|------------|----------------|
| `ADMIN` / `MANAGEMENT` | Administrador / Gestão | Org inteira, configurações, aprovar/publicar |
| `SOCIAL_MEDIA` | Social Media | Clientes atribuídos, criar demanda, briefing, revisão |
| `DESIGNER` | Designer | Fila de design, timer |
| `VIDEOMAKER` / `VIDEO_EDITOR` | Videomaker / Editor | Fila de vídeo, captações (videomaker) |
| `OTHER` | Colaborador | Tráfego (seed) |
| `EXTERNAL_CLIENT` | Cliente externo | Só o portal do próprio cliente |

Cliente externo **nunca** vê dado interno (aniversário, endereço, avisos, sessões de trabalho).

---

## Banco, seed e dados de teste

1. Migrations em `prisma/migrations/` — **no mesmo commit** do código que as usa.
2. `npx prisma migrate deploy` em Production/Preview depois do merge, se houver migration nova.
3. Seed cria setores (Social, Design, Vídeo, Tráfego), tipos de conteúdo, prioridades, dois clientes demo (Clínica Sorriso / Bella Clinic), demandas e sessões de trabalho.
4. `npm run check:rls` deve sair `OK` no banco migrado antes de release.

Ambiente de teste compartilhado: tratar como demonstração. Se entrar dado de cliente real, **Neon separado**. Detalhes em `docs/superpowers/notas/2026-09-04-acessos-temporarios-teste.md`.

---

## Qualidade e gates

Toda fatia (1 PR) precisa, no mínimo:

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build    # obrigatório se mexeu em rota, layout ou schema
```

CI (`.github/workflows/ci.yml`) roda exatamente isso em Node 20 a cada PR/push em `master`.

Além disso, conforme o playbook:

| Toque da fatia | Gate extra |
|----------------|------------|
| Lógica de negócio, status, prioridade | Bugbot |
| Auth, permissão, RLS, upload, PII, query nova de cliente | Security Review + Bugbot |
| Só docs | review humano opcional |

Workflow `security.yml`: TruffleHog (segredos) + `npm audit` (informativo até upgrade Next 16).

---

## Segurança

Já no código:

- Headers: `X-Frame-Options DENY`, nosniff, Referrer-Policy, Permissions-Policy, HSTS
- CSP em **Report-Only** (enforce = fatia 3.7)
- Rate limit de login: 5 tentativas / 15 min por e-mail, 20 por IP (`pg_advisory_xact_lock`)
- Mensagem de erro de login **sempre genérica**
- RLS em Client, Contract, Demand, Board, Portal, Project, Shoot, Attachment, Comment, WorkSession, Announcement, Absence
- `poweredByHeader: false`

Pendências conscientes (não “esquecer”):

- Production no plano Hobby da Vercel é pública na borda; a proteção é o `/login` do app
- Highs residuais do `npm audit` no Next 14 — some no upgrade major (Fase 4)
- Não commitar: `.env*`, `.vercel/`, `.superpowers/`, `_e.txt`, dumps, prints com dado real

---

## Documentação

| Documento | Papel |
|-----------|--------|
| [`docs/superpowers/plans/2026-08-07-playbook-metodologia.md`](docs/superpowers/plans/2026-08-07-playbook-metodologia.md) | **Como** trabalhar (skills, gates, prompts) |
| [`docs/superpowers/plans/2026-08-04-roadmap-master.md`](docs/superpowers/plans/2026-08-04-roadmap-master.md) | **O quê** e em que ordem |
| [`AGENTS.md`](AGENTS.md) | Contrato curto para agents |
| `docs/superpowers/specs/` | Designs aprovados |
| `docs/superpowers/notas/` | Evidências, acessos de teste, decisões |
| `docs/superpowers/plans/2026-08-04-fase*.md` | Escopo de cada fase |
| [`design-system/README.md`](design-system/README.md) | Tokens/CSS do Vibe DS (login legado documentado) |

Agents: leia o playbook e o roadmap **antes** de qualquer código. Unidade de trabalho = **1 fatia / 1 PR**. Schema, auth, RLS, upload ou PII fora do plano da fatia → parar e replanejar.

---

## Como contribuir

1. Pegue a **próxima fatia** no roadmap — nunca a fase inteira.
2. Branch: `feat/<fatia>`, `fix/<fatia>`, `chore/<fatia>`, `sec/<fatia>`, `docs/<fatia>`.
3. Conventional Commits **em português**, um commit por tarefa concluída, `tsc` limpo.
4. Migration Prisma no mesmo commit do código que a usa.
5. PR descreve o que testar. Merge só com gates verdes da fatia.

Metodologia (árvore completa no playbook):

- Feature sem design → `brainstorming` → spec → `writing-plans`
- Plano detalhado nesta sessão → `subagent-driven-development`
- Cloud agent dedicado à fatia → `executing-plans`
- Bug sem causa óbvia → `systematic-debugging`
- Hotfix de 1 arquivo, sem schema/auth → execução direta

---

## Estado e fila

Atualizado em 2026-09-22 (após merge do checklist Trello, PR #55).

| Fase | Estado |
|------|--------|
| 0 Pendências | Feita |
| 1 Segurança | Feita no código (ops humanos: checks obrigatórios no GitHub) |
| 2 Entregáveis 18/08 | Feita |
| 3.0 Higiene do ciclo | Mergeada |
| 3.1 Relatórios `/performance` | Mergeada |
| 3.6 Menções `@` | Mergeada |
| Visual Samps + sunset `(app)` | Mergeados |
| Criar demanda + checklist Trello | Mergeados |
| **3.2 Anexos (Drive-first)** | **Próxima fatia** |
| 3.7 CSP enforce | Depois de 3.2 |
| 3.3 / 3.5 Vídeo e pontuação | Esperam input da Samps |
| 4 Capacidade 8h, agenda org. | Depois da Fase 3 restante |
| 5 IA / mobile / SaaS | Só documentos, sem código de produção |

Uso atual: **teste de refinamento** pela empresa — ainda não é operação oficial. Não enviar arquivo ou dado de cliente real neste ambiente.

---

## Licença

Uso interno da Samps Digital. Repositório privado; não há licença open source.
