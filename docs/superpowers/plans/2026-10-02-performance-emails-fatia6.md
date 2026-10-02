# Fatia 6: e-mails de resumo (Resend)

**Spec:** seção 6 de `2026-10-02-performance-kpi-okr-relatorios-design.md`. **Com schema, e-mail e dado de pessoas:** desenho fechado abaixo. Branch: `feat/performance-emails`.

## Variáveis
`RESEND_API_KEY` e `RESEND_FROM_EMAIL` (já existem) e `REPORTS_EMAIL_ENABLED=true` (novo). Sem as duas primeiras ou sem a flag, o cron só registra "desligado" e não envia nada. Ajuste da spec: o remetente é o `RESEND_FROM_EMAIL` já usado em convite e senha; não há `REPORTS_FROM`.

## Banco (migração `20261002220000_report_delivery`)
- Enums `ReportKind` (`LEADER_DAILY`, `MANAGEMENT_WEEKLY`) e `DeliveryStatus` (`SENT`, `FAILED`, `SKIPPED`).
- `ReportDelivery`: usuário, tipo, chave do período, status, erro, data. Único por (usuário, tipo, chave do período): cron repetido não reenvia. Apaga junto com o usuário. RLS interna.
- Preferência `emailReports` (padrão ligada) dentro de `notificationPrefs` (JSON já existente), sem coluna nova.

## Regras (puras, `lib/agency/report-emails.ts`)
- **Quando:** `LEADER_DAILY` de segunda a sexta; `MANAGEMENT_WEEKLY` na segunda. Dia de São Paulo.
- **Período:** diário = dia útil anterior, comparado ao dia útil anterior a ele; semanal = a semana anterior (segunda a domingo), comparada à semana anterior a ela.
- **Chave do período:** diário = dia + setor (um líder de dois setores recebe dois e-mails); semanal = a segunda-feira.
- **Conteúdo:** frase de leitura, 4 números com comparação, o que pede atenção, quem mais entregou (semanal), metas e objetivos do recorte, botão "Abrir Performance". Todo texto vindo do banco é escapado. Rodapé explica como desligar.

## Serviço e cron
- Destinatários: líder = líder ativo de setor ativo, com e-mail e preferência ligada; gestão = Admin e Gestão ativos com preferência ligada. Externo e inativo nunca.
- Pula quem já tem `SENT` no período. Registra `SENT`, `FAILED` (com o erro) ou `SKIPPED`. Resumo calculado uma vez por recorte.
- **Plano gratuito (100 e-mails por dia):** para em 90 envios no dia, registra os restantes como `SKIPPED` ("limite diário") e avisa Admin e Gestão por notificação, uma vez por dia, em vez de falhar calado.
- Falha de um destinatário não derruba os outros.
- `GET /api/cron/relatorios` no mesmo padrão do cron de prazos (`CRON_SECRET`, 503 sem segredo, tempo constante, erro sem detalhe). Agenda `10 11 * * *` UTC (08:10 em Brasília).

## Telas
- **Configurações > Notificações:** chave "Resumos por e-mail" (liga e desliga para a própria pessoa).

## Tasks
- [ ] 1. Migração, schema e preferência `emailReports`.
- [ ] 2. `report-emails.ts` (quando, período, chave, texto e HTML escapado) com testes.
- [ ] 3. Serviço com testes (desligado, destinatários, idempotência, limite, falha isolada, escopo).
- [ ] 4. Cron, `vercel.json` e preferência na tela.
- [ ] 5. Prévia renderizada dos e-mails e gates (tsc, lint, testes, build, revisão de segurança manual).
