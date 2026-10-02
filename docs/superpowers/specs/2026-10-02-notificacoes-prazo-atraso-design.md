# Notificações de prazo e atraso

**Data:** 2026-10-02 · **Status:** implementado. Sem migração de banco.

## Problema
Os tipos `DEADLINE_NEAR` e `DEMAND_OVERDUE` existiam, mas nenhum ponto do sistema os criava; o grupo "Prazos" das preferências não disparava nada.

## Regras (puras, em `lib/agency/deadline-notifications.ts`)
- **Quem recebe:** o responsável (`assigneeId`) com usuário `ACTIVE`. Sem responsável, ninguém recebe individualmente (a gestão enxerga em "Sem responsável").
- **Quais demandas:** abertas (fora de `OPEN_EXCLUDED`: concluída, cancelada, publicada), com `dueDate`. Mesmo prazo que o painel da gestão usa para "Atrasadas".
- **Prazo próximo:** `Prazo amanhã` (1 dia) e `Prazo hoje` (0 dia), tipo `DEADLINE_NEAR`. Demandas já `APPROVED`/`SCHEDULED` não recebem prazo próximo (estão aguardando publicação), mas recebem atraso.
- **Atraso:** `Demanda atrasada` no 1º dia e depois a cada 3 dias (1, 4, 7, …), até 30 dias; tipo `DEMAND_OVERDUE`. Evita aviso diário repetido.
- **Dia de calendário em America/Sao_Paulo**, não UTC (o prazo é um instante, ex. 18:00 UTC; o que importa é o dia local).
- **Mensagem:** `Título da demanda · Cliente`; link `/demandas?abrir=<id>`.
- **Preferências:** `createNotification` já respeita o grupo "Prazos" de cada pessoa.

## Resumo para a gestão: atrasadas sem responsável
- **Quem recebe:** usuários `ACTIVE` do tipo Admin e Gestão.
- **O que recebem:** **um resumo por gestor por dia**, não um aviso por demanda: "N demandas atrasadas sem responsável" + a mais antiga ("atrasada há X dias"). Sem nenhuma, não avisa.
- **Escopo:** respeita o que cada gestor enxerga (mesma regra de `buildContextWhere`): com `clients.view_all` conta todas; sem ela, só os clientes vinculados.
- **Atrasada** = prazo em dia de calendário anterior a hoje (São Paulo); demandas que vencem hoje não entram.
- **Tipo e preferência:** `DEMAND_OVERDUE`, grupo "Prazos" (quem desligou não recebe). Link `/demandas?filtro=sem-responsavel`. Mesma janela de 20 h contra duplicata.
- **Execução:** no mesmo cron/endpoint; falha de um não bloqueia o outro (`allSettled`; 500 se algum falhar, com o outro já gravado).
- **Fora do escopo:** sem responsável com prazo próximo (ainda não atrasada); avisar por setor.

## Execução
- **Vercel Cron** diário, `0 11 * * *` (UTC) = 08:00 em Brasília, via `vercel.json` → `GET /api/cron/prazos`. Cron diário vale no plano Hobby; só roda em Production.
- **Segurança:** o endpoint exige `Authorization: Bearer ${CRON_SECRET}` (comparação em tempo constante). **Sem `CRON_SECRET` responde 503** (fechado por padrão). Erro interno não vaza detalhe. O middleware não cobre `/api`, então a checagem é do próprio endpoint.
- **Idempotência:** não cria se o mesmo usuário já recebeu o mesmo tipo para a mesma demanda nas últimas 20 h (cron rodado duas vezes não duplica).
- **Escala:** busca só demandas com prazo entre 32 dias atrás e 3 dias à frente, no máximo 5000.

## Fora do escopo
- Horário por pessoa/fuso, resumo diário por e-mail e push.
- Marcar notificações antigas como obsoletas quando a demanda é concluída.

## Verificação
Testes de regra (fuso, ritmo de atraso, limite de 30 dias), serviço (filtros da busca, duplicatas, preferência, READY) e endpoint (503/401/200/500). Rodado de verdade contra o banco local: 401 sem segredo e com segredo errado; com o certo, 12 demandas consideradas, 6 avisos criados; 2ª execução criou 0 e pulou 6 duplicadas.
