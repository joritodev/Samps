# Performance, metas, OKRs e resumos: guia de manutenção

Para quem assume o projeto. Spec e planos: `docs/superpowers/specs/2026-10-02-performance-kpi-okr-relatorios-design.md` e `docs/superpowers/plans/2026-10-02-performance-*.md`.

## O que existe
| Onde | O que é |
|---|---|
| `/performance` (Visão geral) | frase de leitura, 5 indicadores comparados, objetivos da agência, metas em andamento, gráfico de entregas por dia, "Pede atenção", rankings e trimestre a trimestre |
| `/performance/okrs` | objetivos e resultados-chave (check-in, histórico, concluir, copiar para o próximo período) |
| `/performance/metas` | metas dos indicadores com semáforo |
| `/performance/indicadores` | tabelas por pessoa e por tipo, com CSV |
| `/performance/meu-resumo` | resumo da própria pessoa (PDF por impressão, CSV). Todo usuário interno acessa |
| Modal do dia | primeiro acesso do dia, para quem executa demandas e não lidera setor |
| E-mails | diário do líder (seg a sex) e semanal da gestão (segunda), via Resend |

## Quem pode o quê
- Ver análise (`/performance`, OKRs, metas, indicadores): permissão `productivity.view`.
- Criar, editar e apagar metas e OKRs: permissão `goals.manage` (Admin e Gestão por padrão; atribua a outras funções em Configurações > Funções).
- Check-in de resultado manual: o dono do objetivo ou quem tem `goals.manage`.
- Cada pessoa vê o que lhe diz respeito: agência, o próprio setor, o que é dela ou o que ela é dona.

## Como o resumo é calculado
- Código: `lib/agency/performance-summary.ts` (regras puras) e `lib/services/performance-summary.service.ts` (consultas). Testado em `*.test.ts` ao lado.
- Dia = dia de São Paulo (`lib/agency/sp-calendar.ts`). O Brasil não tem horário de verão, então o deslocamento fixo de -3 h vale.
- Comparação: período de mesma duração logo antes; mês e trimestre em andamento comparam com os mesmos dias do anterior (`comparisonRangeFor`); modal e e-mail diário comparam com o dia útil anterior.
- **Atrasadas, em ajuste e sem responsável são "agora"** (o banco não guarda histórico de status), por isso não comparam.
- "No prazo" = concluída até o prazo ÷ concluídas com prazo. "Retrabalho" = concluídas que passaram por Ajuste ÷ concluídas. Amostra menor que 3 mostra o aviso "Amostra pequena".

## Como acrescentar um indicador
1. Incluir o valor em `KpiMetric` no `prisma/schema.prisma` e criar a migração (`ALTER TYPE ... ADD VALUE`).
2. Acrescentar a chave em `KpiKey` e em `KPI_CATALOG` (rótulo, unidade, direção, se é "agora") em `performance-summary.ts`.
3. Calcular o valor em `buildPerformanceSummary` (e, se precisar de dados novos, na consulta de `getPerformanceSummary`).
4. Ajustar `lib/agency/performance-format.ts` se a unidade for nova. Metas, OKRs, tela e e-mails passam a aceitar o indicador sozinhos.

## Variáveis de ambiente (Vercel)
- `CRON_SECRET`: obrigatório; sem ele os crons respondem 503.
- `RESEND_API_KEY` e `RESEND_FROM_EMAIL`: e-mails (já usados em convite e senha).
- `REPORTS_EMAIL_ENABLED=true`: liga os resumos por e-mail. **Desligado por padrão.** Antes de ligar, verifique o domínio no Resend.
- Plano gratuito do Resend: 100 e-mails por dia; o sistema para em 90 e avisa a gestão.

## Banco
Migrações da frente (aplicar com `npx prisma migrate deploy` em produção, o deploy da Vercel não aplica sozinho): `20261002190000_goals`, `20261002200000_okrs`, `20261002210000_report_seen`, `20261002220000_report_delivery`. Todas as tabelas novas têm RLS (cliente externo não lê nem grava).

## Crons (`vercel.json`, só rodam em Production)
- `/api/cron/prazos` 11:00 UTC: avisos de prazo e atraso.
- `/api/cron/relatorios` 11:10 UTC (08:10 em Brasília): e-mails de resumo, celebração de meta batida (metas que acabaram nos últimos 2 dias) e, na segunda, a cobrança de check-ins pendentes (notificação, sem gastar e-mail).
- Falha de envio responde 500 e fica no log da Vercel; o corpo diz quantos falharam. Cada envio fica em `ReportDelivery` (SENT, FAILED, SKIPPED); falhas são tentadas de novo na próxima rodada do mesmo dia.

## Pontos de atenção
- OKR manual morre se ninguém atualiza: a cobrança de segunda e a seção "Check-ins pendentes" do e-mail semanal existem por isso.
- Não há ranking entre pessoas de propósito: cada um se compara com a meta e consigo mesmo.
- Pontuação e bonificação (fatia 3.5 do roadmap master) seguem bloqueadas esperando as regras da Samps.
