# Dark polish — app interno (agency + auth + legacy)

**Data:** 2026-07-28  
**Status:** Aprovada em chat  
**Escopo:** B — varredura completa do app interno (sem portal externo)

## Problema

O tema dark (`next-themes` + tokens em `globals.css`) já existe, mas várias superfícies usam cores fixas (`bg-amber-50`, `text-slate-*`, `#F8F9FA`) sem variantes `dark:`, quebrando contraste em sheets, cards, calendário, auth e rotas legacy `(app)`.

## Decisão

**Abordagem 1 — tokens semânticos + `dark:` pontual** para alertas/ambers, reutilizando o padrão já usado no Painel de Gestão / MetricCard.

## Regras

| Antes | Depois |
|-------|--------|
| `slate-*` | `muted` / `foreground` / `border` / `card` |
| `#F8F9FA` / fundos hardcoded | `bg-background` ou `bg-muted/30` |
| Bloco alerta amber claro | `border-amber-500/25 bg-amber-500/10 text-amber-900 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200` |

## Arquivos-alvo (mínimo)

- `components/sector/sector-card-sheet.tsx`
- `components/board/card-detail-sheet.tsx`
- `components/board/board-view.tsx`
- `components/shared/demand-card.tsx`
- `components/calendar/agency-calendar.tsx`
- `components/agency/{clients-view,client-detail-view,team-view,agenda-view}.tsx`
- `components/board/board-settings-form.tsx`
- `components/auth/{forgot,reset}-password-form.tsx`
- `app/(app)/{notificacoes,usuarios,gestao}/page.tsx`
- Outros hits de `slate`/`amber` no interno (exceto portal)

## Fora de escopo

- Portal externo white-label
- Redesign de layout
- Novos tokens além do uso do padrão warning existente

## Aceite

1. Dark: sheets e demand-cards legíveis
2. Calendário/agenda/clients/team sem caixas claras quebradas
3. Auth + `(app)` legíveis em dark
4. Light sem regressão óbvia
5. `npx tsc --noEmit` limpo
