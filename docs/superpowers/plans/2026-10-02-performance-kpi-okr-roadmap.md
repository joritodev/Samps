# Roadmap: Performance, KPIs, OKRs e relatórios

**Spec:** `docs/superpowers/specs/2026-10-02-performance-kpi-okr-relatorios-design.md`
**Regra:** 1 fatia = 1 PR. Cada fatia ganha seu plano detalhado **antes** de ser executada (schema, auth e e-mail só com desenho fechado). Esta página é o índice; a fatia 1 está detalhada em `2026-10-02-performance-resumo-fatia1.md`.

| # | Fatia | Schema | Depende de | Gates extras |
|---|---|---|---|---|
| 1 | Motor do resumo (puro + serviço + testes) | não | — | Bugbot (indicadores) |
| 2 | Página Performance renovada: abas, gráficos SVG, "Pede atenção" | não | 1 | capturas antes/depois |
| 3 | Metas (KPI): catálogo, `Goal`, `goals.manage`, tela Metas, semáforo nos cartões | sim | 2 | Security (permissão) + Bugbot |
| 4 | OKRs: `Objective`, `KeyResult`, check-ins, tela OKRs, painel executivo na Visão geral | sim | 3 | Security + Bugbot |
| 5 | Meu resumo + modal diário + PDF/CSV; `ReportSeen` | sim | 3 | Security (dado pessoal) + Bugbot |
| 6 | E-mails: Resend, `ReportDelivery`, cron `/api/cron/relatorios`, preferência | sim | 3 e 4 | Security + Bugbot |
| 7 | Histórico entre trimestres, celebração de meta batida, e-mail de revisão de OKRs sem check-in | não | 4 e 6 | Bugbot |

## Ordem e motivo
1 e 2 não mexem no banco e já entregam a melhora visível. 3 vem antes de 4 porque o resultado-chave automático usa o catálogo e as metas. 5 e 6 consomem metas e OKRs para que o modal e o e-mail já saiam com leitura de meta. 7 fecha a cultura (comparar, celebrar, cobrar check-in).

## Entrega final (checklist para quem mantém o projeto)
- Variáveis na Vercel: `CRON_SECRET` (já existe), `RESEND_API_KEY`, `REPORTS_FROM`, `REPORTS_EMAIL_ENABLED`.
- Verificar o domínio no Resend e ligar `REPORTS_EMAIL_ENABLED=true`.
- Cron novo em `vercel.json` (Production).
- `docs/superpowers/notas/`: guia curto "como criar metas e OKRs" e "como o resumo é calculado", para quem assumir.
