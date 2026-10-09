# Planejamento semanal de produção (Design e Vídeo)

**Data:** 2026-10-09 · **Status:** implementado (fatias 0 a 7); guia em `docs/superpowers/notas/2026-10-09-planejamento-semanal-guia.md` · **Roadmap de fatias:** `docs/superpowers/plans/2026-10-09-planejamento-semanal-roadmap.md`
**Origem:** painel externo (Lovable/Supabase, repo `sampsdigital2023/boost-forge-platform`) mostrado em vídeo de reunião (11/09/2026) e entregue como zip `Painel_Design_Video`. O áudio do vídeo **não foi transcrito**; esta spec cobre o que a tela e o código mostram.

## Problema

Hoje a Samps planeja a produção semanal de Design e Vídeo num painel separado, com login e banco próprios. O planejamento (quem faz o quê em cada dia, quantas horas cabem) fica fora das demandas, dos clientes e das ausências que já vivem no Samps OS. O pedido: levar o painel para dentro do Samps OS, **idêntico ao que o vídeo mostra**, ligado a demandas e clientes.

## Decisões já tomadas (conversa de 09/10)

| Tema | Decisão |
|---|---|
| Escopo | Porte fiel do painel + ligação com demandas/clientes do Samps |
| Dados | Prisma/Postgres do Samps; sem Supabase, sem auth própria |
| Permissões | Como no original: gestor faz tudo; demais usuários internos criam e movem cards, sem excluir |
| Rotas | `/planejamento-semanal/video` e `/planejamento-semanal/design` |
| Visual | Idêntico ao painel original no quadro; só a moldura (sidebar/header) é do Samps |
| Áudio | Seguir só com o que a tela mostra; o que foi falado e não aparece no código volta como pergunta antes da fatia afetada |

## Premissas assumidas (revisáveis, pergunta ao usuário antes da fatia indicada)

| # | Premissa | Fatia que depende |
|---|---|---|
| A1 | Sábado entra no quadro, como no original (Seg–Sáb, `WEEKDAYS` 1–6). Implementado com a capacidade padrão da pessoa; a gestão zera o sábado nas configurações se não for usado. | 2, 3 |
| A2 | Todo usuário interno com `planning.view` vê os dois setores; edita conforme `planning.edit`. | 1, 3 |
| A3 | Card ligado a uma `Demand` é sentido único: o card mostra status e prazo da demanda e abre a demanda. Concluir o card **não** altera a demanda. | 4 |
| A4 | Pessoas do quadro = usuários internos ativos do setor (`User.sectorId`), sem seed fixo "Léo/Mabelly". | 1, 5 |
| A5 | O quadro do vídeo mostra Seg–Qui na amostra; a lista de dias exibidos segue `WEEKDAYS` do original até o áudio indicar o contrário. | 3 |

## 1. O que o quadro faz (comportamento)

Cada item abaixo aparece nos frames do vídeo ou existe no código do zip. Marca **[vídeo]** quando é visível na tela do vídeo.

1. **Barra superior [vídeo]:** setas de semana, rótulo "Semana N — dd/mm/aaaa a dd/mm/aaaa", botão "Semana atual", seletores de semana e de ano, zoom com % (padrão 86%), ajuste "Semana inteira", botão azul de novo card, Histórico, sair.
2. **Colunas por dia [vídeo]:** cabeçalho escuro com sigla e data (SEG 07/09), cadeado; dentro, uma sub-coluna por profissional (LÉO, MABELLY).
3. **Cards [vídeo]:** título (cliente), duração (1h, 2h), tipo ("Vídeo 1"), chip de categoria (Orgânico, Captação…), chip de status (Concluído, Programado…), ícones de ação no rodapé, faixa lateral colorida por categoria. Captação e roteiro usam cor cheia própria.
4. **Rodapé de coluna [vídeo]:** barra de ocupação azul e texto "Capacidade Xh · Ocupado Xh · Livre Xh" mais sugestões de combinação de vídeos para as horas livres (`slotSuggestions`).
5. **Backlog "não alocado" [vídeo]:** cards sem dia ou sem pessoa, arrastáveis para o quadro.
6. **Resumo "Semana" [vídeo]:** cartão flutuante no canto inferior direito com totais da semana.
7. **Distribuição automática [vídeo]:** diálogo "Sugestão de distribuição" lista cada movimento ("Vídeo 2 — COCO BAMBU: QUA • Mabelly → SEX • Mabelly"); botões "Manter como está", "Outra sugestão" (nova variante), "Aplicar". Algoritmo `suggestDistribution` (horizonte 28 dias, respeita fixos, compromissos, prazos; modo `relaxed` reorganiza alocados).
8. **Cards fixos (cadeado):** `pinned` ou `recurring` não arrastam. Captação e reunião são compromissos e também não saem do lugar na distribuição.
9. **Criar/editar card:** tipo, cliente, título, categoria, duração (presets por tipo), dia, pessoa, status, prazo, notas, obrigatório, fixo semanal. Design tem calculadora (`DesignCalculator`, tempos em `PlanPreset`).
10. **Mover card:** arrastar (dnd-kit) e diálogo "mover" para semana/dia/pessoa.
11. **Concluir:** alterna `concluido`; copiar card cria cópia no backlog.
12. **Gestor:** excluir card; configurar equipe e capacidade (padrão, por dia, por semana); bloqueios/feriados (dia inteiro ou pessoa); presets de duração ("Tipos de produção"); modelos recorrentes; gerar semana a partir dos modelos; duplicar fixos da semana anterior.
13. **Histórico [vídeo]:** lista de alterações da semana (quem, o quê, quando).
14. **Capacidade:** `capacityFor` com precedência: bloqueio → 0; override semana+dia; override do dia da semana; padrão da pessoa.
15. **Largura de coluna:** modos "ajustar" e manual, salvo por setor no navegador (`localStorage`).

Fora de escopo (não portar): login/cadastro do painel, gestão de acessos (`AccessDialog`), cadastro de clientes próprio (`ClientsDialog`). O Samps já tem usuários, papéis e `Client`.

## 2. Ligação com o Samps OS

| Painel original | No Samps OS |
|---|---|
| `team_members` | `PlanMember` (cor, capacidade padrão, ordem) apontando para `User` do setor |
| `clients` | `Client` existente; card guarda `clientId` e um snapshot do nome |
| `plan_cards.demand_id` (modelo recorrente) | `PlanCard.templateId`; **novo** `PlanCard.demandId` opcional → `Demand` |
| `day_blocks` | `PlanDayBlock`; somado a `Absence` (pessoa) e `AgencySettings.holidays` (setor inteiro) |
| `activity_log` | `AuditLog` com `AuditAction` novas, tela do quadro e `/historico` |
| `user_roles` (admin/user) | `planning.manage` (gestor) e `planning.edit`/`planning.view` (demais) |

Ausência cadastrada (`Absence`, `canceledAt` nulo) cobrindo o dia zera a capacidade da pessoa naquele dia, sem precisar criar bloqueio manual. Feriado vira `PlanDayBlock` (o campo `AgencySettings.holidays` existe, mas nenhum código o usa). Os dois entram em `capacityFor` como parâmetros puros (a camada de serviço busca e passa), nunca com acesso a banco dentro da função.

## 3. Modelo de dados

Detalhe e SQL no plano da Fatia 1. Resumo: 6 tabelas novas (`PlanMember`, `PlanCard`, `PlanTemplate`, `PlanDayBlock`, `PlanCapacityOverride`, `PlanPreset`), 2 enums (`PlanCardStatus`, mais o `ADD VALUE` em `AuditAction`), CHECKs de integridade, RLS `internal_only` com `FORCE` em todas, 3 permissões (`planning.view`, `planning.edit`, `planning.manage`). Nada altera tabelas existentes além do enum `AuditAction`.

## 4. Segurança

- Cliente externo nunca acessa: RLS `internal_only` + gate de rota em `types/auth.ts`.
- Toda escrita passa por server action com `requirePermission`; o serviço revalida (padrão `lib/services/goals.service.ts`) e bloqueia `EXTERNAL_CLIENT`.
- Excluir card, mexer em equipe, capacidade, bloqueios, presets e modelos exige `planning.manage`.
- Mover card não pode trocar o setor do card; setor vem do slug da rota validado, não de input livre.
- Entradas validadas por funções puras `parseXInput` (`ok/error`), com limites (horas 0,25–24, semana 1–53, dia 1–6, textos truncados).
- Audit em toda mutação de card e de semana (`logAudit`).

## 5. Fatias

Ver o roadmap de fatias. Ordem: 0 spec → 1 fundação (schema/RLS/permissões) → 2 lógica pura → 3 quadro leitura → 4 cards e dnd → 5 configuração → 6 distribuição e calculadora → 7 entrega. Merge entre fatias; cada uma com gates do playbook.

## 6. Verificação da entrega

Smoke por papel (gestor, designer/videomaker, externo), nos dois setores, e comparação visual com os frames do vídeo (semana 37, colunas SEG–QUA, diálogo de distribuição). Lista completa no roadmap, seção "Verificação".

## 7. Pendências

1. Resumo do que foi dito no vídeo (ou transcrição) para conferir contra a seção 1.
2. Frame final do vídeo (~220 s, tela clara e estreita): identificar se é outro diálogo ou visão mobile.
3. Revisar A1–A5 antes das fatias indicadas.
