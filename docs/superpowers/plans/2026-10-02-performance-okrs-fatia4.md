# Fatia 4: OKRs

**Spec:** seção 3 de `2026-10-02-performance-kpi-okr-relatorios-design.md`. **Com schema, permissão e dado de gestão:** desenho fechado abaixo. Branch: `feat/performance-okrs`.

## Banco (migração `20261002200000_okrs`)
- Enums `ObjectiveStatus` (`ACTIVE`, `DONE`, `CANCELLED`), `KeyResultKind` (`KPI`, `MANUAL`), `Confidence` (`ON_TRACK`, `AT_RISK`, `OFF_TRACK`) e quatro valores em `AuditAction` (`OBJECTIVE_CREATED`, `OBJECTIVE_UPDATED`, `OBJECTIVE_DELETED`, `KEY_RESULT_CHECKED_IN`). Reusa `GoalScope` e `KpiMetric`.
- `Objective`: título, descrição, dono, escopo e vínculo (setor ou pessoa, como na meta), objetivo-pai opcional, período (`startsOn`/`endsOn`), status, autor.
- `KeyResult`: objetivo, título, tipo, indicador (só `KPI`), unidade em texto (só `MANUAL`), valor inicial, alvo, valor atual (só `MANUAL`, espelha o último check-in), ordem.
- `KeyResultCheckIn`: resultado-chave, autor, valor, confiança, nota, data.
- Integridade no banco: `CHECK` de escopo e vínculo do objetivo; `CHECK` de que `KPI` tem indicador e `MANUAL` não; alvo diferente do inicial; fim ≥ início. Objetivo-pai com `ON DELETE SET NULL`; resultados-chave e check-ins em cascata.
- RLS `internal_only` nas três tabelas. Permissão `goals.manage` já existe (fatia 3).

## Regras (puras, `lib/agency/okr.ts`)
- **Progresso do resultado-chave:** `(atual − inicial) / (alvo − inicial)`, limitado a 0–1 (vale para subir e para descer). Sem valor atual: sem leitura.
- **Progresso do objetivo:** média dos resultados-chave com leitura; sem nenhum, sem leitura.
- **Ritmo esperado:** fração decorrida do período (0–1). **Confiança calculada:** `ON_TRACK` se o progresso está até 10 pontos abaixo do esperado, `AT_RISK` até 25, `OFF_TRACK` além; progresso 100% é sempre `ON_TRACK`. Resultado-chave manual usa a confiança do último check-in quando há um; senão a calculada.
- **Cascata:** o pai precisa ter escopo mais amplo (agência > setor > pessoa); isso impede ciclo. O progresso do pai é só dele (não soma os filhos).
- **Quem vê:** quem tem `goals.manage` vê todos; os demais veem os da agência, do próprio setor, os próprios e os que são donos.
- **Quem escreve:** objetivos e resultados-chave só com `goals.manage`; check-in manual também pelo dono do objetivo.
- **Valor atual de resultado-chave KPI:** o indicador no período do objetivo (até hoje), no recorte dele (mesma regra das metas).

## Serviço e ações
- Listar (árvore, visibilidade, KPI avaliado, último check-in e histórico curto), criar/editar/apagar objetivo, encerrar (`DONE`/`CANCELLED`) e reabrir, duplicar para o próximo período, criar/editar/apagar resultado-chave, registrar check-in. Toda escrita checa permissão no serviço, valida o recorte (setor e pessoa existem e estão ativos), audita.
- No máximo 40 objetivos avaliados por página.

## Telas
- Aba **OKRs** (`/performance/okrs`): filtro de período (atual, anterior, todos), objetivos em árvore (agência → setor → pessoa) com progresso, confiança e resultados-chave; check-in com valor, confiança e nota; histórico com mini gráfico; ações de gestão (editar, resultado-chave, encerrar, duplicar, apagar).
- **Visão geral:** bloco "Objetivos da agência" (painel executivo).

## Tasks
- [ ] 1. Migração, schema e rótulos de auditoria.
- [ ] 2. `okr.ts` com testes.
- [ ] 3. Serviço com testes (permissão, visibilidade, cascata, check-in, duplicar, KPI avaliado).
- [ ] 4. Ações, aba OKRs, formulários e check-in.
- [ ] 5. Bloco na Visão geral.
- [ ] 6. Gates: tsc, lint, testes, build, navegador, revisão de segurança manual.
