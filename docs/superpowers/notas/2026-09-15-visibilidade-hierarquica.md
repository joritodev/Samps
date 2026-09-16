# Nota — Visibilidade hierárquica (Fatia A)

**Data:** 2026-09-15  
**Branch/PR:** cursor/demandas-visibilidade-hierarquica-eaab

## Decisão

Fim da demo 3.4 de leitura cruzada entre setores. Hierarquia tipo Trello:

- Colaborador: só próprias demandas (`assigneeId` / `requesterId`) + Meu Painel do setor
- Líder (`sector.leaderId`): quadro do setor em `/setores/{slug}` e filtro ampliado em `/demandas`
- Gestão/Admin: visão global

## Smoke manual

1. `designer@` em `/demandas` — só as dele; `/setores/video` redireciona ao Meu Painel design
2. Líder de design em `/setores/design` — opera; em `/demandas` vê setor
3. `gestao@` — `/demandas` global; todos `/setores/*`
