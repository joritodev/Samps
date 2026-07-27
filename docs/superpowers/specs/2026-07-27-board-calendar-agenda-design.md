# Board calendar — visual parity with Agenda

**Date:** 2026-07-27  
**Status:** Approved in chat (“seguiremos assim por enquanto”)  
**Reference UI:** `components/agency/agenda-view.tsx` (`/agenda`)  
**Target:** Client board calendar toggle in `components/board/board-calendar.tsx`

## Problem

The board calendar uses `react-big-calendar` with a generic library look. The agency Agenda uses a custom month grid (filters + chips + day detail panel) that matches the product language. They should feel like the same product.

## Decision

**Approach A:** Rewrite only the board calendar to clone the Agenda layout, wired to real client demand data. Do not change `/agenda` (stays mock). Do not extract a shared component yet.

## Layout

Inside the board’s Calendário view (keep Board header UX B unchanged):

| Zone | Content |
|------|---------|
| Left | Filters card (`rounded-2xl`, shadow-none) |
| Center | Month grid card with prev/next month and colored chips |
| Right | “Detalhes da Demanda” for the selected day |

- No KPI strip on this view (board already has optional Indicadores).
- Visual tokens aligned with Agenda: chips, selected-day ring, today highlight, dashed empty state.

## Data & interaction

- Source: demands already passed to `BoardCalendar`.
- Event date priority: `publishDate` → `dueDate` → `deliveryDate` (same as today).
- Chip tone by demand type (Feed / Story / Video / follow-up / other), max 2 chips per day + “+N mais”.
- Clicking an item in the day panel calls existing `onSelect(id)` → opens `CardDetailSheet`.
- Month navigation is local UI state; independent of board competence.

## Filters

- Types present on the board (e.g. Feeds, Stories, Acompanhamento, Extras / demand types available).
- No sector filters (single-client context).

## Out of scope

- Changes to `/agenda` or its mock data.
- Shared calendar primitive extraction.
- Removing `react-big-calendar` from the repo if still used elsewhere (only drop it from board usage).
- Competence-locked calendar month (may be a later polish).

## Acceptance criteria

1. Switching to Calendário on a client board shows Agenda-like three-column layout.
2. Real demands appear on the correct days with type-colored chips.
3. Selecting a day updates the right panel; selecting an item opens the card sheet.
4. Type filters hide/show events without leaving the calendar view.
5. Kanban view and board header (Filtros / Indicadores / ⋯) remain unchanged.
