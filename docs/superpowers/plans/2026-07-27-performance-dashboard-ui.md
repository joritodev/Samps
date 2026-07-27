# Performance Dashboard UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/performance` with period strip (4 demand metrics) + detail panel (7 metrics), dark-friendly, client selection defaulting to Semana.

**Architecture:** Keep server page fetching `getIndicators` × 3. Rewrite `PerformanceDashboard` as a client component with local `selected` period state. Compact Metric-style tiles (painel-gestão), no nested StatCards, no invented %.

**Tech Stack:** Next.js App Router, React client state, Tailwind tokens (`bg-card`, `primary`, `destructive`, emerald tones).

**Spec:** [`docs/superpowers/specs/2026-07-27-performance-dashboard-ui-design.md`](../specs/2026-07-27-performance-dashboard-ui-design.md)

## Global Constraints

- Only real `IndicatorSnapshot` fields
- Default selected period: `week`
- Strip: completed, inProgress, overdue, adjustments
- Detail: all 7 metrics
- Commits only if user asks
- Verify: `npx tsc --noEmit`

---

## File map

| File | Responsibility |
|------|----------------|
| Rewrite: `components/agency/performance-dashboard.tsx` | Strip + detail UI, client state |
| Unchanged: `app/(agency)/performance/page.tsx` | Fetch + pass props |

---

### Task 1: Rewrite PerformanceDashboard

**Files:**
- Rewrite: `components/agency/performance-dashboard.tsx`

- [x] **Step 1:** Implement `"use client"` dashboard with `PeriodKey`, strip of 3 period cards (4 metrics each), detail grid (7 metrics), Metric-style tones, default `week`
- [x] **Step 2:** Run `npx tsc --noEmit` — no errors in performance files
- [ ] **Step 3:** Manual: `/performance` — Semana selected; click Hoje/Mês updates detail; dark readable

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Strip 4 metrics | 1 |
| Detail 7 metrics | 1 |
| Default Semana | 1 |
| Dark / painel-gestão tones | 1 |
| No invented % | 1 |
| Page API unchanged | 1 |
