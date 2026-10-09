# Planejamento semanal de produção (Design e Vídeo): roadmap de fatias

**Data:** 2026-10-09 · **Status:** planejado (nenhum código). Próximo passo: Fatia 0 (spec) com aprovação do usuário.
**Origem:** painel externo (Lovable/Supabase) mostrado em vídeo de reunião + zip `Painel_Design_Video`. O áudio do vídeo não foi transcrito.


## Context

A Samps usa hoje, fora do Samps OS, um painel feito no Lovable/Supabase (repo `sampsdigital2023/boost-forge-platform`, zip "Painel_Design_Video"). É um quadro semanal de produção: colunas Seg–Sáb, uma linha por profissional, cards de demanda com duração em horas, capacidade diária por pessoa, backlog "não alocado", demandas recorrentes, bloqueios/feriados, distribuição automática ("Sugestão de distribuição": Marcar como está / Outra sugestão / Aplicar) e histórico. O mesmo componente atende os setores Design e Vídeo. O vídeo enviado é uma reunião mostrando esse painel (semana 37, rota `/planejamento-semanal-video`).

Objetivo: trazer isso para dentro do Samps OS (Next 14, Prisma, next-auth, Tailwind 3), em duas rotas, ligado às demandas e clientes que já existem, sem Supabase.

**Limite conhecido:** não consegui transcrever o áudio do vídeo (proxy bloqueou o download do modelo). O plano se baseia no código do zip, nos frames do vídeo e nas respostas do usuário. Qualquer pedido falado que não esteja no código deve entrar na spec da Fatia 0 (ver "Pendências").

## Decisões já tomadas (usuário)

| Tema | Decisão |
|---|---|
| Escopo | Porte fiel do painel **+ ligação com demandas/clientes do Samps** |
| Dados | Prisma/Postgres do Samps (nada de Supabase) |
| Permissões | Como no original: gestor faz tudo (excluir, equipe, capacidade, modelos, presets); demais usuários internos criam e movem cards, sem excluir |
| Rotas | `/planejamento-semanal/video` e `/planejamento-semanal/design` (um componente por `sector`) |

## Fidelidade ao vídeo (requisito: "exatamente como o vídeo mostra")

Regra: o visual e o comportamento do quadro replicam o painel do zip/vídeo (layout, cores, textos, ícones). Isto **substitui** qualquer ideia de reestilizar com o design-system do Samps no quadro; só a moldura (sidebar/header do `(agency)`) é do Samps. Cada fatia compara com os frames do vídeo antes do PR.

Checklist do que **aparece nos frames** (rota `/planejamento-semanal-video`, semana 37, 07/09–12/09/2026) e a fatia que cobre:

| Visível no vídeo | Fatia |
|---|---|
| Barra: seta ‹ › de semana, "Semana 37 — 07/09/2026 a 12/09/2026", botão "Semana atual", seletor "Semana 37", seletor de ano "2026" | 3 |
| Zoom/lupa com % (86%), ícone de ajuste, "Semana inteira" (ajustar colunas à tela) | 3 |
| Botão azul de novo card (canto direito) | 4 |
| Ícones de ações: gerar/duplicar semana, **Histórico**, sair | 4, 5 |
| Colunas por dia (SEG 07/09, TER 08/09, QUA 09/09, QUI 10/09…) em cabeçalho escuro com cadeado | 3 |
| Sub-colunas por profissional (LÉO, MABELLY) com cadeado | 3 |
| Cards: título (cliente), duração (1h/2h), tipo ("Vídeo 1"), chip de categoria (Orgânico/Captação), chip de status (Concluído/Programado), ícones de ação no rodapé, faixa lateral colorida | 3, 4 |
| Rodapé da coluna: barra azul de ocupação + "Capacidade 6h / Ocupado / Livre" + sugestões de combinação de vídeos | 2, 3 |
| Área inferior de demandas não alocadas (backlog) | 3, 4 |
| Cartão flutuante "Semana" (resumo da semana, canto inferior direito) | 6 |
| Diálogo "Sugestão de distribuição": linhas "Vídeo 2 — COCO BAMBU: QUA • Mabelly → SEX • Mabelly", botões "Manter como está", "Outra sugestão", "Aplicar" | 6 |
| Cards fixos/recorrentes (cadeado), arrastar entre pessoa/dia | 4, 5 |

**Não confirmado (não aparece legível nos frames, ou só no áudio):** qualquer diálogo ou tela que o apresentador abra fora dos frames acima, o tela final (frame ~220 s, tela clara com botões azuis e layout estreito — possivelmente outro diálogo ou visão mobile), a rota/visão do setor Design (o vídeo só mostra `-video`), e tudo o que foi *dito*. Só ~12 dos 59 frames amostrados (≈ 50 s de 238 s) mostram a tela; o resto é a pessoa falando.

## Processo (AGENTS.md / playbook)

Feature nova sem design → **brainstorming → spec → writing-plans por fatia → SDD**. Mexe em schema, permissão e RLS → **Security Review + Bugbot**, modelo forte no desenho. **1 fatia = 1 PR**, merge entre fatias, branch `feat/planejamento-<fatia>`. Ledger em `.superpowers/sdd/progress.md`. Gates: `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test`, `npm run check:rls`.

Entregáveis de documentação: spec `docs/superpowers/specs/2026-10-09-planejamento-semanal-design.md`, planos de fatia em `docs/superpowers/plans/2026-10-09-planejamento-fatiaN.md`, e entrada no roadmap master (seção "Estado real").

## O que o zip contém e o destino de cada parte

| Zip | Destino no Samps OS |
|---|---|
| `lib/week.ts` (semana ISO, `formatHours`, `WEEKDAYS` 1–6) | `lib/agency/planning/week.ts` + teste. Usar `lib/agency/sp-calendar.ts` (`dayKey`, `addDays`) para datas |
| `lib/planner.ts` lógica pura: `capacityFor`, `slotSuggestions`, `deadlineWeekday`, `suggestDistribution`, regra de `generateWeekFromDemands`/`duplicatePreviousWeek`, `designMinutes`, `SECTOR_CONFIG`, kinds/categorias/estilos | `lib/agency/planning/*.ts` **sem** acesso a banco, com Vitest (copiar quase literal, trocar tipos) |
| `lib/planner.ts` funções `fetch*`/`supabase.from` | Reescrever em `lib/services/planning.service.ts` (Prisma) |
| `routes/.../planejamento-semanal-video.tsx` (3333 linhas, `PlannerPage` + `CardDialog`, `DistributionDialog`, `MoveCardDialog`, `SettingsDialog`, `ClientsDialog`, `DemandsDialog`, `HistoryDialog`, `DesignCalculator`, `AccessDialog`) | Quebrar em `components/planning/*` (board, column, card, dialogs). `AccessDialog` e `ClientsDialog` **não portar**: Samps já tem `/usuarios`, papéis e `Client` |
| `routes/auth.tsx`, `_authenticated`, `access.functions.ts`, `integrations/supabase/*` | **Descartar** (next-auth + `requirePermission` do Samps) |
| `drizzle/migrations 0000–0005` | Só referência de campos; reescrever como migration Prisma única (abaixo) |
| Dependências do zip (TanStack Start/Router, Tailwind 4, React 19, Vite, supabase-js, drizzle, jspdf, mammoth, recharts) | **Não adicionar.** Já existem: `@dnd-kit/*`, `date-fns`, `sonner`, Radix. Conferir se `jspdf`/`mammoth` são usados por algo do painel antes de descartar (esperado: não) |

Adaptações de compatibilidade: React 18, Tailwind 3 (classes do zip como `bg-white/20`, `text-white` funcionam; revisar tokens), componentes `components/ui` já existentes (`dialog`, `select`, `tabs`, `popover`, `sheet`). O quadro mantém o visual do painel original (ver "Fidelidade ao vídeo"); só a moldura é do Samps.

## Desenho do schema (fechar na Fatia 0, com Opus)

Reaproveita `Sector` (slugs `design`/`video`), `User` (pessoa do quadro), `Client`, `Demand`, `Absence`, `AuditLog`, `AgencySettings`. Tabelas novas (prefixo `Plan`):

- `PlanMember` — configuração da pessoa no quadro: `userId` (único), `color`, `defaultCapacityHours` (padrão 6), `sortOrder`, `active`. Pessoas elegíveis = usuários internos do setor (`sectorId`); evita o seed fixo "Léo/Mabelly".
- `PlanCard` — `sectorId`, `isoYear`, `isoWeek`, `weekday?` (1–6), `memberId?` (User), `kind`, `clientId?` + `clientNameSnapshot?`, `demandId?` (FK opcional → `Demand`), `templateId?`, `title`, `category`, `durationHours` (Decimal), `status` (enum `nao_alocado|programado|em_edicao|revisao|concluido`), `pinned`, `required`, `recurring`, `dueDate?`, `notes?`, `position`, timestamps. Índice `(sectorId, isoYear, isoWeek)`.
- `PlanTemplate` (= `recurring_demands`) — `sectorId`, `clientId?`, `title`, `kind`, `category`, `durationHours`, `weeklyQuantity`, `preferredMemberId?`, `preferredWeekday?`, `required`, `active`, `sortOrder`.
- `PlanDayBlock` — `sectorId`, `isoYear`, `isoWeek`, `weekday`, `memberId?` (null = setor inteiro), `reason`.
- `PlanCapacityOverride` — `memberId`, `weekday?`, `isoYear?`, `isoWeek?`, `hours` (mesma precedência de `capacityFor`: semana+dia > dia > padrão).
- `PlanPreset` (= `video_presets`) — `sectorId`, `label`, `hours`, `sortOrder` (os tempos do design vêm daqui, como no original).
- Histórico: **não criar `activity_log`**; usar `AuditLog` com novas `AuditAction` `PLAN_CARD_*`, `PLAN_WEEK_*` (migration `ALTER TYPE ... ADD VALUE`), `logAudit()` e `listAuditLogs({entityType:"PlanCard"})`, rótulos em `lib/agency/audit-labels.ts`.
- Constraints `CHECK`: `weekday BETWEEN 1 AND 6`, `durationHours > 0`, `isoWeek BETWEEN 1 AND 53`, `weeklyQuantity >= 1`.
- **RLS:** policy `internal_only` + `FORCE ROW LEVEL SECURITY` em todas as 6 tabelas (modelo: migration `20260824090000_rls_announcement_absence`). Cliente externo nunca vê nada. Acrescentar checagens em `scripts/check-rls.ts`.
- **Permissões** (códigos em `lib/permissions/codes.ts` + `PERMISSION_LABELS`, `lib/agency/permission-groups.ts`, INSERT em `Permission` na migration, `prisma/seed.ts`):
  - `planning.view` — ver o quadro (todo usuário interno)
  - `planning.edit` — criar/editar/mover/concluir cards, aplicar distribuição
  - `planning.manage` — excluir cards, equipe/capacidade, bloqueios, modelos recorrentes, presets, gerar/duplicar semana (gestor)
- Gate de rota em `types/auth.ts` (`agencyAccessRedirect`) e item no `NAV_ITEMS` de `components/agency/agency-sidebar.tsx` (`anyOf: ["planning.view"]`).

## Ligação com o Samps (a parte "+ demandas")

Proposta inicial (confirmar na spec; o usuário só escolheu "ligado às demandas"):
1. Card pode ter `demandId` opcional: ao criar o card, escolher uma `Demand` aberta do cliente/setor (título, cliente, prazo e responsável pré-preenchidos).
2. Sentido único e conservador: concluir o card **não** altera a `Demand` (o ciclo da demanda tem regras próprias: aprovação, link do Drive). O card mostra o status/prazo atual da demanda ligada e abre o card da demanda.
3. Cliente do card vem de `Client` (select), com snapshot do nome.
4. `Absence` (folga/férias/offline/atestado) zera a capacidade da pessoa no dia automaticamente, somada aos `PlanDayBlock`; feriados de `AgencySettings.holidays` zeram o dia do setor.
5. Pessoas do quadro = usuários do setor; capacidade padrão pode começar de `AgencySettings` (jornada) mas o campo próprio prevalece.

## Rotas

`app/(agency)/planejamento-semanal/page.tsx` (redireciona ao setor do usuário via `getSectorSlugForUserType`, gestor vai para `video`) e `app/(agency)/planejamento-semanal/[setor]/page.tsx` aceitando só `video|design` (`notFound()` caso contrário), mais `loading.tsx`/`error.tsx`. Server actions em `lib/actions/planning.actions.ts` (retorno `{success}|{error}`, `requirePermission`), serviço em `lib/services/planning.service.ts`, validação pura em `lib/agency/planning/*.ts` no padrão `parseXInput` (`lib/agency/goals.ts`). Atualização otimista no drag, igual ao `components/board/board-kanban.tsx` (`PointerSensor` distance 8, `KeyboardSensor`; extrair drop target para função pura testável como `lib/agency/board-dnd.ts`). Colunas droppable = `pessoa:dia`, mais o backlog.

## Fatias (1 PR cada, em ordem, merge entre elas)

| # | Fatia / branch | Conteúdo | Motor / modelo | Gates |
|---|---|---|---|---|
| 0 | `docs/planejamento-spec` | Brainstorming curto com o usuário (cobrir o áudio do vídeo) → spec + planos das fatias 1–6 + roadmap atualizado | Opus (BR + WP) | — |
| 1 | `feat/planejamento-fundacao` | Schema, migration (enums, tabelas, CHECKs, RLS, permissões, `AuditAction`), seed de presets Design/Vídeo e permissões, `check-rls` | SDD, Opus no desenho | **Security + Bugbot** |
| 2 | `feat/planejamento-logica` | Lógica pura portada com TDD: semana ISO, `capacityFor` (+ `Absence`/bloqueios), `slotSuggestions`, `deadlineWeekday`, `suggestDistribution`, geração/duplicação de semana, tempos do design | SDD, grok-fast | Bugbot |
| 3 | `feat/planejamento-quadro` | Serviço de leitura, rotas, navegação, gate, quadro somente leitura: semana, pessoas × dias, capacidade usada/livre, backlog, filtros, largura de coluna | SDD | Bugbot + build |
| 4 | `feat/planejamento-cards` | CardDialog (kinds/duração/presets/cliente/demanda), criar/editar/mover (dnd + MoveCardDialog), concluir, excluir (manage), auditoria + HistoryDialog | SDD | Bugbot + Security |
| 5 | `feat/planejamento-config` | Equipe e capacidade, bloqueios, presets ("Tipos de produção"), modelos recorrentes, gerar semana, duplicar semana anterior | SDD, Opus nas actions | Bugbot + Security |
| 6 | `feat/planejamento-distribuicao` | Dialog de sugestão (Aplicar / Outra sugestão / Marcar como está), calculadora do Design, resumo da semana | SDD | Bugbot |
| 7 | `docs/planejamento-entrega` | Nota em `docs/superpowers/notas/` (guia + smoke), roadmap, limpeza | DOC | — |

Não executar nada disto antes de a Fatia 0 aprovar a spec. Nenhuma fatia pode mudar schema/permissão fora do que a Fatia 1 fechar (senão BLOCKED e replanejar).

## Riscos

- Áudio do vídeo sem transcrição: requisito falado pode divergir do código do zip → Fatia 0 obrigatória.
- Componente de 3333 linhas: portar por partes, nunca copiar inteiro (React 19/Tailwind 4 → 18/3).
- Fuso/semana ISO: usar sempre `dayKey` de São Paulo e testar virada de ano (semana 53/1).
- Duas fontes de verdade (card × `Demand`): sentido único e sem escrita na `Demand` até decisão contrária.
- Migration em produção (Neon): tabelas novas aditivas, sem alterar as existentes além do `ADD VALUE` do enum.

## Verificação

- `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test` (testes de `lib/agency/planning/*` cobrem capacidade, bloqueios, distribuição, virada de semana), `npm run check:rls` (externo = 0 linhas nas 6 tabelas).
- Smoke manual por papel: gestor (tudo), designer/videomaker (criar e mover, sem excluir), externo (sem acesso à rota).
- Smoke funcional nos dois setores: arrastar card entre pessoa/dia, estourar capacidade, folga cadastrada zera o dia, gerar semana por modelo, duplicar semana, distribuir backlog e aplicar, histórico em `/historico`.
- Comparação visual com os frames do vídeo (semana 37/38, colunas SEG–QUA, diálogo de distribuição).

## Pendências para a Fatia 0

1. Pedidos falados no vídeo que não estão no código (o usuário precisa resumir ou reenviar o áudio/transcrição).
2. Confirmar a semântica da ligação card × demanda (proposta acima).
3. Sábado entra no quadro (o original tem Seg–Sáb; a jornada do Samps é Seg–Sex)?
4. Quem vê o quadro do outro setor (proposta: todo usuário interno vê os dois, edita conforme `planning.edit`).

## Registro de execução (09/10)

- **Fatia 1** (fundação): feita, ver `2026-10-09-planejamento-fatia1-fundacao.md`.
- **Fatia 2** (lógica pura): feita em `lib/agency/planning/` (`types`, `week`, `capacity`, `distribution`, `generate`, `config`) com 50 testes. Achados do porte:
  - O painel original calcula errado a segunda-feira da semana 1 quando 1º de janeiro cai de sexta a domingo (2027 começa em 04/01). Corrigido ancorando em 4 de janeiro, com teste de ida e volta de 2025 a 2028. Fidelidade ao vídeo não inclui bugs.
  - `AgencySettings.holidays` não é usado em lugar nenhum do código; feriados ficam em `PlanDayBlock`. A spec dizia o contrário; vale o `PlanDayBlock`.
  - `capacityFor` e `suggestDistribution` recebem `isAbsent(memberId, "AAAA-MM-DD")` para zerar o dia de quem tem `Absence`; o serviço da Fatia 3 monta essa função com `isAbsentOn`.
