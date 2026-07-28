# Agenda agency — eventos reais

**Data:** 2026-07-27  
**Status:** implementada (`AgendaView` + `listDemands` calendar)  
**Escopo:** `/agenda` com dados reais (layout 3 colunas), filtros alinhados ao banco  
**Fora:** extrair calendário compartilhado com o quadro do cliente; alterar `AgencyCalendar` / `(app)/calendario` além do necessário; Agenda mock permanece deletada ao final

## Contexto

`app/(agency)/agenda/page.tsx` renderiza `AgendaView` com `MOCK_EVENTS` e KPIs/filtros hardcoded (social/design/video + feeds/stories/captações). Já existem:

- `listDemands(user, { context: "calendar" })` + `AgencyCalendar` em `app/(app)/calendario`
- Datas em `Demand`: `dueDate`, `deliveryDate`, `publishDate`
- Spec anterior do quadro (`2026-07-27-board-calendar-agenda-design.md`) que **não** altera `/agenda`

Esta fatia fecha a Agenda da agency com a mesma fonte de verdade das demandas.

## Decisões

| Tema | Decisão |
|------|---------|
| Escopo | Só `/agenda` + filtros reais (opção B) |
| Datas | `dueDate` + `deliveryDate` + `publishDate` (até 3 eventos por demanda) |
| Visibilidade | ADMIN/MANAGEMENT: todas; demais: setor do usuário e/ou atribuídas a si (opção A) |
| Abordagem | Evoluir `AgendaView` (manter UI 3 colunas); page server passa props |
| Compartilhar com quadro | Fora desta fatia |
| Auth | `requireAuth()` (como hoje); reutilizar escopo de `listDemands` calendar se já bater com A |

## Arquitetura

```
AgendaPage (server)
  └─ requireAuth + listDemands(..., { context: "calendar" })  // ou getAgendaDemands wrapper
       └─ AgendaView (client) events + filter options + KPIs derivados
```

### Unidades

1. **Fetch / escopo** — Usar `listDemands` com `context: "calendar"`. Hoje `calendar` cai no `default` de `buildContextWhere` (só restringe clientes se não tiver `clients.view_all`). **Nesta fatia, ajustar `buildContextWhere` para `calendar`:** ADMIN/MANAGEMENT (ou quem tiver visão ampla já usada na gestão, ex. `clients.view_all` / userType ADMIN|MANAGEMENT) vê tudo; demais restringem a `sectorId === user.sectorId` **OU** `assigneeId === user.id`. Não criar segunda fonte divergente.
2. **Mapeamento** — Função pura `demands → AgendaEvent[]`: para cada demanda, emitir evento por cada data não nula (`kind`: `due` | `delivery` | `publish`). `id` do evento = `${demandId}:${kind}`. Incluir `demandId`, título, cliente, setor (slug/nome), status, assignee opcional, ISO date.
3. **AgendaView** — Remove `MOCK_EVENTS` / KPIs fixos; recebe `events` (ou `demands` + mapeia no client — preferir map no server ou módulo compartilhado server-safe). Filtros:
   - **Tipos de agenda:** Prazos / Entregas / Publicações (`kind`)
   - **Setores:** opções derivadas dos eventos presentes (slug/nome real), não só social/design/video mock
4. **KPIs** — Contagens derivadas dos eventos **já filtrados pelo escopo do usuário** (não mock): total de eventos no mês visível + breakdown por setor (top setores ou setores presentes). Sem inventar %/SLA.
5. **Detalhe do dia** — Painel direito lista eventos do dia selecionado; clique navega para o quadro do cliente (`/clientes/[id]/quadro` ou rota já usada no app) com ênfase na demanda se houver query suportada; se não houver deep-link estável, link para o cliente + título da demanda. Sem abrir sheet complexo novo nesta fatia.

## UI

- Manter estrutura: KPIs no topo → grid 3 colunas (Filtros | Calendário mês | Detalhes).
- Chips no calendário por `kind` (tons distintos: prazo / entrega / publicação); max 2 por dia + “+N”.
- Dark: tokens `bg-card`, `border-border`, evitar pastéis só-light sem variante `dark:` (alinhar ao Performance/painel-gestão onde tocar).
- Navegação de mês local (estado client), independente de competência do quadro.

## Fora de escopo

- Extrair primitive compartilhado Agenda ↔ board calendar
- Captações como tipo de filtro mock separado (só se forem demandas/tipos reais no banco)
- Criar/editar eventos na Agenda (read-only nesta fatia)
- EXTERNAL_CLIENT / portal

## Aceite

1. Login gestão → `/agenda` mostra eventos coerentes com demandas do seed/banco (não Clínica Sorriso mock-only).
2. Login colaborador de setor → só vê eventos do seu escopo (setor e/ou assignee).
3. Filtros kind e setor escondem/mostram chips e o painel do dia.
4. Uma demanda com as três datas gera três eventos em dias (possivelmente distintos).
5. KPIs refletem contagens reais do mês/cursor, não 12/5/4/3 fixos.
6. `npx tsc --noEmit` sem erros novos nestes arquivos.

## Relação com specs existentes

- Complementa (não contradiz) `2026-07-27-board-calendar-agenda-design.md` — aquela permanece só no quadro do cliente.
- Pode reutilizar ideias de `AgencyCalendar` (kinds due/delivery/publish) sem substituir o layout da agency Agenda.
