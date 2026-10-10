# Roadmap de fatias: projetos, captações, histórico do card, representantes e convites

**Spec:** `docs/superpowers/specs/2026-10-10-projetos-captacoes-historico-design.md`. Regra do playbook: 1 fatia = 1 PR; schema/permissão/RLS só com plano detalhado e Security Review. Migrations em produção só pelo workflow `migrate-production.yml`, com autorização explícita.

| # | Fatia | Conteúdo | Toca schema/permissão |
|---|---|---|---|
| 1 | Spec e roadmap | Este documento e a spec | não |
| 2 | Histórico do card | Prazo livre, descrição editável, linha do tempo no card, atraso derivado, migration de correção (`DemandDelay`, `notificationPrefs`) | sim (permissão, migration) |
| 3 | Captações | `Demand.shootId`, `Shoot.projectId`, agendar, concluir com link, notificar editor, auditoria `SHOOT_*` | sim |
| 4 | Projetos | `Project.outsideContract`, criar/editar, detalhe, seletor na nova demanda, progresso e status derivados | sim |
| 5 | Representantes | `ClientContact`, CRUD na ficha, aniversários na agenda e no mural | sim (tabela nova, RLS) |
| 6 | Convites `.ics` | Geração do arquivo para reuniões e captações; envio por e-mail quando o Resend estiver ativo | não |
| 7 | Integração | Card de captação no planejamento semanal, quadro do Social usando `Shoot`, simulação e seed | não |
| 8 | Entrega | Guia, roadmap master, migrations em produção, dados de exemplo | ops |

**Ordem:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Cada fatia terá plano próprio (`writing-plans`) antes do código.

**Gates por fatia:** `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test`, `npm run check:rls` (fatias 2 a 5), smoke por papel (gestão, social, designer, cliente externo), Security Review nas fatias com schema ou permissão.

**Fora desta rodada:** OAuth do Google Agenda (aguarda a conta da Samps), checklist próprio do projeto, anexos.
