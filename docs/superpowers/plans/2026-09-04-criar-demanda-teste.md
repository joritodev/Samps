# Fatia — Criar demanda + ciclo pronto para teste externo

**Data:** 2026-09-04  
**Motor:** executing-plans (AUTO)  
**Goal:** Empresa consegue testar o fluxo operacional: criar demanda → briefing/demandar → assumir → produzir → revisão → ajuste → publicar. Acessos temporários documentados (seed).

## Escopo

1. Trocar stub "Nova Demanda em breve" por sheet + server action usando `createDemand`.
2. Demandas em `PENDING_PLANNING` / `PLANNING` / `BACKLOG` aparecem no quadro `/demandas`.
3. Nota de acessos temporários para teste (não uso oficial).
4. Smoke com subagentes por cargo após o PR.

## Fora de escopo

- Anexos, multi-tenant, NestJS, alterar RLS/schema (sem migration).
- Redesign visual.

## Aceite

- Social/gestão cria demanda em `/demandas` com cliente, título, setor, prioridade.
- Status inicial `PENDING_PLANNING`; briefing via sheet existente leva a `DEMANDED`.
- Ciclo setor (assumir → produzir → revisar → ajuste) permanece intacto.
- `tsc`, `lint`, `test` verdes.
