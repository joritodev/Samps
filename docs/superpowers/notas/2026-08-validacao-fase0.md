# Validação Fase 0 — fluxos assumidos como prontos

Data: 2026-08-04  
Branch base: `master` (Tasks 1–3 mergeadas, HEAD `1575029`)  
Método: checks server-side (Prisma + services) + inspeção estática da UI. Browser MCP indisponível.

## Task 4 — brief

- Cronômetro de demanda (assumir → iniciar → pausar com motivo → retomar → concluir com link; status `IN_PRODUCTION` → `IN_REVIEW`; tempo acumulado): OK — `work-session.service` exercitado com `designer@samps.digital`; `totalActiveSeconds=4`; status final `IN_REVIEW`.
- Link do Drive obrigatório na conclusão: OK — `completeWorkSession` rejeita URL vazia; demanda permanece `IN_PRODUCTION`; UI desabilita botão sem `materialUrl.trim()` (`card-detail-sheet`, `design-board`).
- Campos obrigatórios no briefing (sem descrição → erro "Informe a descrição do briefing"): OK — toast exato na UI; service rejeita com `Campo obrigatório: description`; status permanece em planejamento.
- Geração de cartões contratuais por competência: OK — `createNextCompetence` gerou 5 cartões (3 FEED + 2 STORY) conforme `ContractService`.
- Portal do cliente (`cliente@samps.digital` só `/portal`): OK — user `EXTERNAL_CLIENT`; `getDashboardPath` → `/portal`; `auth.config` redireciona rotas não-portal.

## Task 2 — smokes diferidos (escopo de contrato)

- Criar cliente Estático=8/mês + Stories=12/mês → aba Contrato com sufixos: OK — serviços persistidos `Estático 8 / mês`, `Stories 12 / mês`; UI usa `periodicitySuffix`.
- Editar Stories→0, Estático→10 → Stories some, Estático 10/mês: OK — ativo único `Estático 10 / mês`; `normalizeScopeLines` descarta qty 0.
- Criar cliente só com nome → contrato vazio + "Cadastrar escopo": OK — zero contratos; CTA presente em `client-detail-view`.

## Task 3 — smokes diferidos (ações por status)

- Planning: "Concluir briefing" visível: OK — `canDemandBriefing(PLANNING)=true`; `demand-card` exibe CTA quando gate permite.
- `IN_PRODUCTION`: CTA de briefing oculto: OK — `canDemandBriefing(IN_PRODUCTION)=false`.
- `IN_REVIEW`: solicitar ajuste disponível, não concluir produção: OK — `canRequestAdjustment=true`, `canCompleteProduction=false`.
- `DONE`/`PUBLISHED`: sem as três ações: OK — gates falsos para briefing/produção/ajuste.

## Limitações

- Login/navegação visual ponta a ponta no browser: NÃO VERIFICADO — browser MCP indisponível neste ambiente; regras e wiring de UI confirmados por código + DB.
- Credenciais seed confirmadas em `prisma/seed.ts`: `DEFAULT_PASSWORD = Samps@2026` (não re-testadas via tela de login).
