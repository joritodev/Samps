# Relatório — teste por cargo + segurança (produção)

**Data:** 2026-09-09  
**Modo:** AUTO (subagents por cargo + crawler HTTP + probes defensivos)  
**Alvo:** https://samps-os.vercel.app  
**Contas:** seed `docs/superpowers/notas/2026-09-04-acessos-temporarios-teste.md` (senha `Samps@2026`)

## Como foi feito

1. Oito subagents (Gestão, Social, Designer, Videomaker, Editor, Tráfego, Admin, Cliente) no modo auto: código + rotina do cargo.
2. Um subagent de segurança **defensiva** (headers, cookies, authn/authz, RLS conhecido — sem exploits).
3. Um subagent de browser (computerUse) percorrendo login e telas.
4. Crawler HTTP autenticado: 8 papéis × ~48 rotas; conferência de PII no HTML.
5. Correções no código deste PR para os vazamentos confirmados.

A produção ainda reflete o `master` antigo até o deploy deste PR.

## Login e sessão (todos os 8 cargos)

Todos autenticaram. `mustResetPassword = false`. Redirect pós-login correto:

| E-mail | userType | Home |
|--------|----------|------|
| `gestao@samps.digital` | MANAGEMENT | `/painel-gestao` |
| `social@samps.digital` | SOCIAL_MEDIA | `/meu-painel/social` |
| `designer@samps.digital` | DESIGNER | `/meu-painel/design` |
| `videomaker@samps.digital` | VIDEOMAKER | `/meu-painel/video` |
| `editor@samps.digital` | VIDEO_EDITOR | `/meu-painel/video` |
| `trafego@samps.digital` | OTHER | `/meu-painel/trafego` |
| `admin@samps.digital` | ADMIN | `/painel-gestao` |
| `cliente@samps.digital` | EXTERNAL_CLIENT | `/portal` (Bella Clinic) |

Painéis cruzados (`/meu-painel/design` como social, etc.) redirecionam ao home do cargo (`requirePanelUserType`).

## O que funcionou por cargo

### Gestão / Admin
- `/painel-gestao`, `/demandas`, `/equipe`, `/performance`, `/historico`, `/configuracoes/*` (incluindo funções e portal).
- Revisão de ciclo no código: `canReviewDemand` = Social + Gestão + Admin; publicar só `APPROVED`/`SCHEDULED`.
- Gestão em produção está ligada a um cliente extra (`Teste`); admin seed sem `clientIds` — portal admin abre vazio (UX, não isolamento).

### Social
- Home `/meu-painel/social`; `/demandas` (criar); `/setores/*` em leitura (demo 3.4).
- `/performance` e `/historico` redirecionam (sem `productivity.view` / `history.view`).
- Seções de settings administrativas (`/funcoes`, `/empresa`, …) voltam ao hub.
- Pode revisar/aprovar no código (`canReviewDemand`).

### Designer / Videomaker / Editor / Tráfego
- Homes corretas; fila do próprio painel.
- Não revisam (`canReviewDemand` false).
- Sem `demands.create` (exceto se a UI de demandas ainda mostrar atalho — a action exige a permissão).
- Videomaker tem `shoots.create`; editor não.
- `/setores/*` abre em **somente leitura** (demo 3.4) — vê filas de outros setores.
- `/portal` interno bloqueado (sem `portal.view_as_client`).

### Cliente externo
- Isolamento **OK**: `/painel-gestao`, `/demandas`, `/equipe`, `/setores/*`, `/configuracoes` → `/portal`.
- Portal: “Olá, Bella Clinic”; `/portal/arquivos` 200.
- Não vê mural/ausências da agência (layout portal separado).
- Permissão só `portal.view`; um `clientId`.

## Bugs encontrados na produção (antes do PR)

| ID | Severidade | Evidência | Correção neste PR |
|----|------------|-----------|-------------------|
| B1 | **Alta (PII)** | Designer/Social/Tráfego em `/equipe` recebem HTML com e-mails de `admin@`, `gestao@`, `social@`, `designer@`. Página só tinha `requireAuth`; a nav escondia o link. | `requireAnyPermission("users.edit", "users.create")` |
| B2 | **Alta** | Qualquer interno abre `/painel-gestao` (h1 “Painel da Gestão”), inclusive quem não é gestão. Social ainda tem `indicators.view` na seed. | Gate por `userType` ADMIN/MANAGEMENT; nav igual |
| B3 | **Média** | Rotas legacy `(app)` vivas: `/usuarios`, `/relatorios`, `/calendario` (sunset #35 incompleto). | Redirects no `next.config` + páginas stub |
| B4 | **Média** | Social abre `/configuracoes/portal` via `portal.view` (gravação já exigia `settings.access`). | Seção só com `settings.access` |
| B5 | Baixa | CSP ainda Report-Only; `unsafe-inline`/`unsafe-eval` — aceito Fase 3.7 | Nenhuma (já no roadmap) |
| B6 | Baixa | Portal do `admin@` sem clientes vinculados — tela vazia | Fora do escopo (dado seed) |
| B7 | Info | Dual `/calendario` vs `/agenda` | Redirect `/calendario` → `/agenda` |

### O que NÃO estava quebrado

- Cliente não entra na operação interna.
- Login genérico: e-mail existente e inexistente → `CredentialsSignin` idêntico (1 tentativa cada).
- Cookies `__Secure-authjs.session-token` / `__Host-authjs.csrf-token`: HttpOnly, Secure, SameSite=Lax.
- Headers: `X-Frame-Options: DENY`, `nosniff`, HSTS, Referrer-Policy, Permissions-Policy, sem `X-Powered-By`.
- Rate limit no código: 5/15 min e-mail, 20/IP, advisory lock — **não** esgotado em produção neste teste.
- `/.env` e schema não servem conteúdo; caem no middleware → `/login`.
- Actions de settings do portal já exigiam `settings.access`.

## Segurança (defensivo)

| Check | Resultado |
|-------|-----------|
| Unauth `/` e internas | 307 → `/login` |
| Mensagem/erro de senha | Genérica (mesmo `error=CredentialsSignin`) |
| Session cookie | HttpOnly + Secure + SameSite=Lax |
| Clickjacking | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` |
| CSP enforce | Não (Report-Only) — conhecido |
| RLS | Policies existem; `check:rls` não rodou aqui (sem `DATABASE_URL` de prod). Gaps já documentados: Attachment `clientId` null; CSP 3.7 |
| Superfície API | Só `/api/auth/[...nextauth]` |
| Timing bcrypt se usuário não existe | Residual (bcrypt só roda se o user existe) — não alterado |

## Correções no código (este PR)

- `canSeeManagementDashboard` / `canSeeTeamDirectory` / `hasAnyPermission` + `requireAnyPermission`.
- `/painel-gestao` e item “Dashboard” da sidebar só Admin/Gestão.
- `/equipe` exige `users.edit` **ou** `users.create`.
- `/configuracoes/portal` deixa de aceitar só `portal.view`.
- `/usuarios` → `/equipe`; `/relatorios` → `/performance`; `/calendario` → `/agenda`.

Testes: `npx vitest run` 149/149; `tsc --noEmit` OK; lint OK.

## Rotina operacional (código, não mutação em massa na prod)

Ciclo esperado (notas de teste da empresa):

1. Social/Gestão: `/demandas` → Nova demanda → briefing → Demandada.
2. Executor (design/vídeo/tráfego): Assumir → Iniciar → Entregar (link) → Em revisão.
3. Revisor (Social/Gestão/Admin, não o executor): ajuste **ou** aprovar.
4. Publicar só depois de Aprovada.

Regras unitárias (`labels.test.ts`) verdes: briefing só planejamento; produzir em `IN_PRODUCTION`/`ADJUSTMENTS`; publicar não em `IN_REVIEW`.

## Residual / não bloqueante

- Demo 3.4: colaborador lê `/setores/*` de outros setores. `getSectorBoardData` **não** recorta `clientIds` — tráfego (só Bella) viu Clínica Sorriso no quadro de design. Correção de escopo fica para fatia própria (muda o contrato da demo 3.4).
- Líder de setor no Meu Painel (`leaderFullView`) ignora `view_assigned` e vê a fila inteira do setor (videomaker/Bella viu card da Sorriso).
- Publicar / mover cartão / visibilidade ao cliente: várias actions ainda só `requireAuth` + regra de status (não `canReviewDemand`).
- JWT `session.update` aceita `impersonatingClientId` do cliente; gestão com `clientIds[0]=Teste` entra em `/portal` sem clicar “Visualizar como cliente”.
- `shoots.create` / `projects.create` / `demands.extra_create` no seed sem UI de criar.
- CSP Report-Only; Attachment `clientId` null no RLS; timing bcrypt se e-mail não existe.
- Upload binário ainda não existe (só link). Filtros de `/demandas` “em breve”.
- **Efeito colateral na prod:** o QA de videomaker concluiu produção da demanda “Edição — depoimento paciente” (Sorriso) sem ser executor. O PR passa a exigir executor + `canAccessClient`.
- Confirmar no **deploy deste PR**: designer em `/equipe` e `/painel-gestao` cai no próprio painel; portal do cliente lista entregas/calendário; first-access não aceita `userId` alheio.

## Follow-up após os subagents (mesmo PR)

- `portal.view` passa a contar em `canAccessClient` (subpáginas do portal do cliente não ficam vazias).
- `submitFirstAccess` usa só a sessão (`requireAuth` + `mustResetPassword`).
- `getCardDetailAction` recusa cartão fora do escopo de cliente.
- `completeWorkSession` exige executor + acesso ao cliente.
- `callbackUrl` rejeita `//` e `\`.

## Reprodução rápida (após deploy)

```bash
# designer não deve ver e-mails de admin/gestao em /equipe
# social não deve ver h1 "Painel da Gestão" em /painel-gestao
```

Senha seed: trocar antes de go-live.
