# Atrasos Permanentes + Prazo Gestão Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar episódios permanentes de atraso e permitir que a gestão altere prazos com justificativa formal.

**Architecture:** Modelo `DemandDelay` + `delay.service.ts` com detecção on-read; action `changeDemandDeadlineAction` com audit; UI nos sheets e Painel de Gestão.

**Tech Stack:** Next.js 14, Prisma, shadcn/ui, permissão `demands.change_deadline`.

**Spec:** [`docs/superpowers/specs/2026-07-28-atrasos-prazo-gestao-design.md`](../specs/2026-07-28-atrasos-prazo-gestao-design.md)

## Global Constraints

- Escopo: prazos only (sem WorkSession)
- Justificativa mínima 10 caracteres
- Permissão `demands.change_deadline`
- Verify: `npx tsc --noEmit`
- Commits only if user asks

---

### Task 1: Schema + delay.service

- [ ] Prisma `DemandDelay` + enum + migrate
- [ ] `lib/services/delay.service.ts`

### Task 2: Action + resolução em conclusão

- [ ] `lib/actions/deadline.actions.ts`
- [ ] Hook `resolveOpenDelay` em `registerPublicationAndComplete`

### Task 3: Sync on-read

- [ ] `sector-board.service`, `board.service`, `management.service`

### Task 4: UI + Painel

- [ ] `deadline-change-form`, `demand-delay-history`
- [ ] Sheets + painel-gestao + getCardDetailAction

### Task 5: Seed + verify

- [ ] seed episódios demo
- [ ] `npx tsc --noEmit`
