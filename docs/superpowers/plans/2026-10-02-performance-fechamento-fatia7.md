# Fatia 7: histórico, celebração e check-ins pendentes

**Spec:** seção 4 (histórico) e riscos (adoção) de `2026-10-02-performance-kpi-okr-relatorios-design.md`. **Sem schema.** Branch: `feat/performance-fechamento`.

## Histórico entre trimestres
- Novo período **Trimestre anterior** (trimestre fechado) ao lado de Hoje, Semana, Mês e Trimestre atual.
- **Comparação justa:** mês atual contra os mesmos dias do mês anterior; trimestre atual contra os mesmos dias do trimestre anterior; trimestre anterior contra o trimestre antes dele. Hoje, semana e livre seguem com o período de mesma duração logo antes.
- Bloco **Trimestre a trimestre** na Visão geral: os últimos 4 trimestres (o atual parcial) no recorte escolhido, com concluídas, no prazo e retrabalho.

## Celebração
- **Meta batida:** a rotina diária olha as metas cujo período acabou nos últimos 2 dias; se o resultado final bateu a meta, avisa a gestão (e o líder do setor ou a pessoa, conforme o escopo) por notificação. Não repete (a mesma pessoa não recebe o mesmo aviso em 7 dias). Só no fechamento, para não celebrar meta trivialmente cumprida no começo do período.
- **Objetivo concluído:** ao marcar como concluído, o dono recebe a notificação.
- A meta atingida ganha ícone de festa na tela (com texto, não só cor).

## Check-ins pendentes (adoção de OKR)
- Resultado-chave manual de objetivo em andamento sem check-in há 7 dias ou mais (ou nunca, com o objetivo começado há 7 dias ou mais) é "pendente".
- **Segunda-feira:** cada dono recebe uma notificação com a contagem (uma por dia, sem repetir); o **e-mail semanal da gestão** ganha a seção "Check-ins pendentes" com quem e qual resultado.
- Notificação não gasta o limite de e-mails.

## Execução
- As três rotinas rodam no cron `/api/cron/relatorios`, independentes entre si (uma falha não derruba as outras). Notificação não depende da flag do e-mail.

## Entrega
- `docs/superpowers/notas/2026-10-02-performance-guia.md`: guia para quem assume o projeto (como criar metas e OKRs, como o resumo é calculado, variáveis, migrações, crons, e-mails, como acrescentar um indicador).
- Roadmap marcado como concluído.

## Tasks
- [ ] 1. Períodos e comparação justa (`performance-period`) com testes.
- [ ] 2. Histórico trimestral (serviço e bloco).
- [ ] 3. Celebrações (regra, serviço, objetivo concluído, ícone) com testes.
- [ ] 4. Check-ins pendentes (regra, lembrete, seção do e-mail) com testes.
- [ ] 5. Cron, guia, roadmap, gates e revisão de segurança manual.
