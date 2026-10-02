# Performance, KPIs, OKRs e relatórios

**Data:** 2026-10-02 · **Status:** proposta para aprovação · **Fatias:** ver `docs/superpowers/plans/2026-10-02-performance-kpi-okr-roadmap.md`

## Problema
A página Performance repete os mesmos números, não compara com nada e não diz se o resultado é bom. A CEO quer implantar cultura de KPI e OKR usando as métricas do sistema, e a equipe que mantém o projeto depois da entrega não é a que o construiu. Por isso a entrega precisa sair completa.

## Decisões já tomadas (conversa de 02/10)
- **Quem define metas e OKRs:** só Admin e Gestão (por enquanto). Todos os usuários internos veem o que lhes diz respeito.
- **Período:** trimestre por padrão, mas personalizável (mês, trimestre ou datas livres).
- **Telas:** a Performance vira um conjunto de abas: **Visão geral** (painel executivo com OKRs), **Indicadores**, **OKRs**, **Metas** e **Meu resumo**.
- **Relatórios:** líder de setor recebe **diário** do próprio setor; gestão e admin recebem **semanal**; os demais usuários veem um **modal** no primeiro acesso do dia, dispensável, com o resumo da própria pessoa, e podem rever e baixar em "Meu resumo".
- **E-mail:** Resend no plano gratuito (100 e-mails/dia, 3.000/mês). Domínio ainda não verificado: tudo é construído com o envio **desligado** por `REPORTS_EMAIL_ENABLED`.
- **Gráficos:** SVG próprio, sem biblioteca nova.
- **Sem ranking pessoa contra pessoa** no começo: cada pessoa é comparada com a meta e com o próprio período anterior.

## 1. Resumo (função única)
`buildSummary({ scope, range })` em `lib/agency/performance-summary.ts` (puro) alimentado por um serviço que lê o banco. Usado pela página, pelo modal e pelos e-mails.

- **Escopo:** agência inteira, um setor ou uma pessoa.
- **Período:** atual e o anterior de mesma duração (semana contra semana, trimestre contra trimestre, intervalo livre contra o intervalo imediatamente anterior).
- **Indicadores** (catálogo `KPI_CATALOG`): ver seção 2.
- **Variação:** `OVERDUE`, `ADJUSTMENTS` e `UNASSIGNED_OPEN` são fotos de "agora" (o banco não guarda histórico de status), então **não comparam** com o período anterior; mostram só o valor atual. Os demais comparam. Valor atual, valor anterior, diferença e direção (melhor, pior, igual). "Melhor" depende do indicador (mais entregas é melhor, mais atrasadas é pior).
- **Destaques:** atrasadas por setor, demandas sem responsável, ajustes, quem mais entregou, tipo de conteúdo mais lento.
- **Frase de leitura:** gerada por regras ("Semana 18% melhor que a anterior…"), nunca por IA.
- **Série diária** para o gráfico (atual contra anterior).
- **Amostra pequena:** mantém a regra existente (`SMALL_SAMPLE_N`).

## 2. KPIs e metas
**Catálogo (código, não banco):** cada indicador tem chave, nome, unidade, direção (maior é melhor ou menor é melhor) e como calcular.

| Chave | Cálculo |
|---|---|
| `COMPLETED` | demandas com `productionCompletedAt` no período |
| `ON_TIME_RATE` | entregues até o prazo / entregues com prazo |
| `OVERDUE` | abertas com prazo vencido, agora (sem comparação) |
| `REWORK_RATE` | entregas que passaram por Ajuste / entregues |
| `ADJUSTMENTS` | demandas em Ajuste |
| `WORKED_HOURS` | soma de `WorkSession.totalActiveSeconds` |
| `AVG_LEAD_TIME_DAYS` | média, em dias, entre criação e conclusão de produção |
| `UNASSIGNED_OPEN` | abertas sem responsável |

**Meta (`Goal`):** indicador + escopo (agência, setor ou pessoa) + valor-alvo + direção + período (`startsOn`, `endsOn`) + ativo.
**Semáforo:** verde atingiu; amarelo até 10% do alvo (configurável por meta com `warnMargin`); vermelho além disso. Progresso proporcional em barra.
**Onde aparece:** cartões da Visão geral e dos Indicadores, resumo, modal, e-mails.

## 3. OKRs
- **Objetivo (`Objective`):** título, descrição, dono, escopo (agência, setor, pessoa), período livre (padrão: trimestre atual), status (`ACTIVE`, `DONE`, `CANCELLED`), objetivo-pai opcional (cascata agência → setor → pessoa).
- **Resultado-chave (`KeyResult`):** título, unidade, valor inicial, alvo, direção e tipo:
  - `KPI`: liga a um indicador do catálogo e o valor atual é **calculado** (no escopo do objetivo, dentro do período dele);
  - `MANUAL`: valor atual vem do último check-in.
- **Check-in (`KeyResultCheckIn`):** valor, confiança (`ON_TRACK`, `AT_RISK`, `OFF_TRACK`), nota curta, autor, data. Mantém o histórico para o gráfico de evolução.
- **Progresso:** `(atual − inicial) / (alvo − inicial)` limitado a 0–100%; o do objetivo é a média dos resultados-chave.
- **Risco automático:** resultado-chave KPI fica `AT_RISK` se o ritmo esperado (linear no período) estiver mais de 10 pontos acima do progresso real.
- **Permissões:** criar/editar/encerrar objetivo e meta exige `goals.manage` (Admin e Gestão). Check-in manual pode ser feito pelo dono do objetivo ou por quem tem `goals.manage`. Leitura: quem tem `productivity.view`; pessoa só vê objetivos da agência, do próprio setor e os próprios.

## 4. Telas (`/performance`)
- **Visão geral:** frase de leitura, indicadores com comparação e meta, gráfico de entregas por dia, "Pede atenção", objetivos da agência com progresso. É o painel executivo da CEO.
- **Indicadores:** o que existe hoje (resumo por período, por pessoa, por tipo), renovado e com filtros e CSV.
- **OKRs:** lista por trimestre (ou período), árvore agência → setor → pessoa, check-in, histórico, encerrar e duplicar para o próximo trimestre.
- **Metas:** CRUD de metas e visão do semáforo por escopo.
- **Meu resumo:** resumo da pessoa com comparação, metas dela, seleção de dia/semana/mês, **baixar PDF** (impressão do navegador com estilo próprio) e CSV.
- **Histórico:** comparação entre trimestres na Visão geral (seletor de período).

## 5. Modal diário
- Aparece para os colaboradores que executam demandas (**não** para líder de setor, Admin e Gestão, que recebem e-mail), uma vez por dia, no primeiro acesso a uma página interna.
- Conteúdo: resumo de ontem (entregas, no prazo, horas), o que pede atenção hoje, progresso das metas dela e da equipe, "Ver minha fila" e "Entendi".
- Estado: tabela `ReportSeen` (usuário + dia local de São Paulo). Dispensar grava o dia; só volta no dia seguinte. Fim de semana: usa a última sexta como "ontem".
- Acessível: foco preso, `Esc` fecha, respeita `prefers-reduced-motion`.

## 6. E-mails (Resend)
- **Líder de setor:** diário, dias úteis, ~08:00 de São Paulo, resumo do setor.
- **Gestão e Admin:** semanal, segunda ~08:00, resumo da agência com OKRs e metas em risco.
- Envio por usuário ativo com e-mail; `notificationPrefs.emailReports = false` desliga (checkbox em preferências).
- **Idempotência:** tabela `ReportDelivery` (usuário, tipo, chave do período, status, erro); cron repetido não reenvia.
- **Limite do plano gratuito:** o cron conta os envios do dia e para em 90, registra e avisa a gestão por notificação em vez de falhar calado.
- **Desligado por padrão:** sem `REPORTS_EMAIL_ENABLED=true` + `RESEND_API_KEY` + `REPORTS_FROM`, o cron só registra "pulado".
- **Segurança:** mesmo padrão do cron de prazos (`CRON_SECRET`, 503 sem segredo, tempo constante). O e-mail não leva dados sensíveis além de contagens e nomes de demandas do próprio escopo da pessoa.
- **Cron:** novo `GET /api/cron/relatorios` (diário às 11:00 UTC) decide o que enviar conforme o dia da semana.

## 7. Banco (migração única por fatia)
`Goal`, `Objective`, `KeyResult`, `KeyResultCheckIn`, `ReportSeen`, `ReportDelivery`; enums `KpiMetric`, `GoalScope`, `GoalDirection`, `ObjectiveStatus`, `KeyResultKind`, `Confidence`, `ReportKind`, `DeliveryStatus`; permissão nova `goals.manage` (Admin e Gestão por padrão). Detalhes de campos e índices ficam no plano de cada fatia (3, 4, 5 e 6). Nenhuma tabela existente é alterada.

## 8. Fora do escopo
- Bonificação e pontuação (fatia 3.5, aguardando regras da Samps).
- Ranking entre pessoas, push notification, metas por cliente, integração com Google Agenda.
- OKRs com pesos por resultado-chave e alinhamento cruzado entre objetivos que não sejam pai/filho.

## 9. Riscos
- **Adoção:** OKR manual morre se ninguém atualiza. Mitigação: resultado-chave KPI automático, e-mail semanal que lista objetivos sem check-in há 7 dias.
- **Limite do Resend:** coberto acima.
- **Cálculo caro:** consultas agregadas por período, sem carregar linhas; índices em `Demand(productionCompletedAt)` e `Demand(dueDate)` se faltarem.

## 10. Verificação
Testes unitários dos cálculos (catálogo, período anterior, semáforo, progresso, risco, "ontem" em fim de semana), do serviço (escopo e permissão) e dos endpoints do cron; prova com navegador real e capturas antes e depois de cada tela; prévia dos e-mails renderizada.
