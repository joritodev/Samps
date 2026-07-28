# Agenda Real Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/agenda` mock with real demand events (due/delivery/publish), scoped calendar visibility, and real filters/KPIs.

**Architecture:** Adjust `buildContextWhere` for `calendar`; map `listDemands` results to `AgendaEvent[]`; evolve `AgendaView` to consume props and filter by kind + sector.

**Tech Stack:** Next.js App Router, Prisma `listDemands`, client Agenda UI.

**Spec:** [`docs/superpowers/specs/2026-07-27-agenda-real-events-design.md`](../specs/2026-07-27-agenda-real-events-design.md)

## Global Constraints

- No invented %/SLA
- No shared calendar extraction with board
- Read-only Agenda
- Commits only if user asks
- Verify: `npx tsc --noEmit`

---

## File map

| File | Responsibility |
|------|----------------|
| Modify: `lib/services/demands.service.ts` | `calendar` scope + sector.slug include |
| Create: `lib/agency/agenda-events.ts` | Pure map demand → events |
| Rewrite: `components/agency/agenda-view.tsx` | Props-driven UI |
| Modify: `app/(agency)/agenda/page.tsx` | Fetch + pass events |

---

### Task 1: Calendar scope + mapper

- [x] **Step 1:** `case "calendar"` in `buildContextWhere` (ADMIN/MANAGEMENT full; else sector OR assignee); include `sector.slug`
- [x] **Step 2:** Create `lib/agency/agenda-events.ts` with kinds due/delivery/publish

### Task 2: AgendaView + page

- [x] **Step 1:** Rewrite `AgendaView` to accept `events`, filters kind+sector, KPIs from month, link to client board
- [x] **Step 2:** Wire `agenda/page.tsx` via `listDemands(..., { context: "calendar" })`
- [x] **Step 3:** `npx tsc --noEmit`
