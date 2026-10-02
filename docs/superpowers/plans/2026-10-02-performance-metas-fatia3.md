# Fatia 3: metas (KPIs com meta)

**Spec:** seções 2 e 7 de `2026-10-02-performance-kpi-okr-relatorios-design.md`. **Com schema**, permissão e dado de gestão: desenho fechado abaixo. Branch: `feat/performance-metas`.

## Banco (migração `20261002190000_goals`)
- Enums `KpiMetric` (os 8 indicadores do catálogo), `GoalScope` (`AGENCY`, `SECTOR`, `USER`) e três valores novos em `AuditAction` (`GOAL_CREATED`, `GOAL_UPDATED`, `GOAL_DELETED`).
- Tabela `Goal`: indicador, escopo, `sectorId`/`userId` (um só, conforme o escopo), `target` (na unidade do indicador; percentual é razão 0 a 1), `warnMargin` (padrão 0,10), `startsOn`/`endsOn` (primeiro e último instante, dias de São Paulo), `note`, `active`, autor.
- Integridade no banco: `CHECK` ligando escopo e vínculo; `CHECK` de valores (alvo ≥ 0, margem de 0 a 1, fim ≥ início). `ON DELETE CASCADE` para setor e pessoa; autor `RESTRICT`.
- RLS `internal_only` igual às outras tabelas internas (cliente externo não lê nem grava).
- Permissão `goals.manage` (Admin e Gestão), pela mesma via da `boards.manage_lists`.
- Sem alterar tabela existente. A direção (maior ou menor é melhor) vem do catálogo, não é coluna.

## Regras (puras, `lib/agency/goals.ts`)
- **Validação:** indicador do catálogo; escopo coerente com setor/pessoa; alvo finito e ≥ 0 (percentual até 1); margem 0 a 1; datas `AAAA-MM-DD` válidas, fim ≥ início; observação até 200 caracteres.
- **Semáforo:** maior é melhor: atingiu = verde; até a margem abaixo do alvo = amarelo; além = vermelho. Menor é melhor: espelhado. Sem dado = "sem leitura". Progresso 0 a 1.
- **Quem vê:** quem tem `goals.manage` vê todas; os demais veem as da agência, as do próprio setor e as próprias.
- **Valor atual** de uma meta é o do indicador no período da própria meta (limitado a hoje), no recorte dela.

## Serviço e ações
- `goals.service`: listar (com visibilidade), criar, editar, ativar/pausar, apagar. Escrita exige `goals.manage` (checada no serviço), setor e pessoa precisam existir (pessoa ativa e interna), meta ativa não pode se sobrepor a outra do mesmo indicador, escopo e período. Toda escrita grava auditoria.
- Avaliação agrupa metas pelo mesmo (recorte, período) para consultar o resumo uma vez por grupo; no máximo 30 metas por página.
- `goals.actions`: finas, só chamam o serviço e revalidam `/performance`.

## Telas
- Nova aba **Metas** (`/performance/metas`): metas por escopo com valor atual, semáforo (cor + texto + ícone) e barra; quem gerencia cria, edita, pausa e apaga; encerradas ficam recolhidas.
- **Visão geral:** bloco "Metas em andamento" com as metas vigentes do recorte escolhido.

## Tasks
- [ ] 1. Migração, schema, permissão (códigos, rótulo, grupo) e seed.
- [ ] 2. `goals.ts` com testes (validação, semáforo, visibilidade).
- [ ] 3. Serviço com testes (permissão, sobreposição, auditoria, avaliação agrupada).
- [ ] 4. Ações, aba, página Metas, formulário.
- [ ] 5. Bloco de metas na Visão geral.
- [ ] 6. Gates: tsc, lint, testes, build, navegador (claro, escuro, celular), revisão de segurança manual.
