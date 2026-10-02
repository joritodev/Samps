# Fatia 5: Meu resumo e modal diário

**Spec:** seções 4 e 5 de `2026-10-02-performance-kpi-okr-relatorios-design.md`. **Com schema e dado pessoal:** desenho fechado abaixo. Branch: `feat/performance-meu-resumo`.

## Banco (migração `20261002210000_report_seen`)
- `ReportSeen`: usuário + dia (`AAAA-MM-DD` de São Paulo), único por par; apaga junto com o usuário.
- RLS: a pessoa só vê e grava as próprias linhas (`userId = app_current_user_id()`); cliente externo não tem linha.

## Regras (puras, `lib/agency/daily-summary.ts`)
- **Público do modal:** usuários internos que executam demandas (Social Media, Designer, Videomaker, Editor de Vídeo, Outros) e **não** lideram setor. Admin, Gestão e líderes recebem e-mail (fatia 6).
- **"Ontem":** o dia útil anterior (segunda, sábado e domingo mostram a sexta).
- **Mensagem:** frase por regras a partir das entregas do dia contra o dia anterior; nunca ranking nem comparação com outras pessoas.
- **Mostrar só se houver o que dizer:** entregas, tempo trabalhado, algo pedindo atenção, meta ou objetivo seu.

## Serviço e ações
- `daily-summary.service`: monta o conteúdo do modal (resumo do dia da pessoa, vence hoje, atrasadas, ajustes, até 3 metas relevantes e até 2 objetivos em que é dona) e decide se mostra (público + não visto hoje).
- Dispensar grava `ReportSeen` do dia (idempotente) e só vale para a própria pessoa.
- O modal é carregado dentro de `Suspense` no layout, sem atrasar a página; só consulta quem está no público e ainda não viu hoje.

## Telas
- **Modal** no primeiro acesso do dia: números de ontem, o que pede atenção hoje, progresso das metas e objetivos, "Ver minha fila" e "Entendi". Foco preso, `Esc` fecha, respeita `prefers-reduced-motion`.
- **Meu resumo** (`/performance/meu-resumo`): a mesma leitura para ontem, semana ou mês, com gráfico, metas e objetivos da pessoa; **baixar PDF** (impressão do navegador com estilo próprio) e **CSV**. Acessível a todo usuário interno, mesmo sem `productivity.view`; quem não tem essa permissão só vê esta aba.

## Tasks
- [ ] 1. Migração e schema.
- [ ] 2. `daily-summary.ts` com testes (público, dia útil, mensagem).
- [ ] 3. Serviço e ações com testes (público, visto, conteúdo, idempotência, dado só da própria pessoa).
- [ ] 4. Modal no layout e página Meu resumo (PDF e CSV).
- [ ] 5. Gates: tsc, lint, testes, build, navegador, revisão de segurança manual.
