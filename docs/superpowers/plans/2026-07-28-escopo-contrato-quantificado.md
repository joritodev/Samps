# Escopo contrato quantificado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No Novo Cliente e na aba Contrato da ficha, cadastrar/editar quantidades por tipo de conteúdo com periodicidade, persistindo `ContractService`.

**Architecture:** Server pages carregam `ContentType` ativos; UI client envia linhas `{ contentTypeId, quantity, periodicity }`; actions em `app/actions/clients.ts` criam/sincronizam `Contract` + `ContractService`. Helper compartilhado de labels/mapa slug→DemandType em `lib/agency/contract-services.ts`.

**Tech Stack:** Next.js 14, Prisma, shadcn Input/Select, server actions.

## Global Constraints

- Só `ContentType` com `isActive=true`.
- Periodicidade: `monthly` | `weekly` | `competence` | `one_shot` (default `monthly`).
- Qtd &lt; 1 → não cria / desativa serviço.
- Não misturar com wizard de quadro nesta fatia.

---

## File map

| File | Role |
|------|------|
| `lib/agency/contract-services.ts` | Labels periodicidade + slug→DemandType + tipo de linha |
| `app/actions/clients.ts` | `createClient` aceita services; nova `syncClientContractServices` |
| `components/agency/contract-scope-fields.tsx` | UI reutilizável (linhas qtd + select) |
| `components/agency/clients-view.tsx` | Sheet Novo Cliente usa campos |
| `components/agency/client-detail-view.tsx` | Aba Contrato editável |
| `app/(agency)/clientes/page.tsx` | Passa content types |
| `app/(agency)/clientes/[id]/page.tsx` | Passa content types + contractId |

---

### Task 1: Helper + createClient com services

- [ ] Criar `lib/agency/contract-services.ts`
- [ ] Estender `createClient` em `app/actions/clients.ts`
- [ ] `npx tsc --noEmit`

### Task 2: UI Novo Cliente

- [ ] `ContractScopeFields` + wire em `clients-view.tsx`
- [ ] Page `/clientes` passa tipos ativos
- [ ] Smoke mental: submit com 2 tipos

### Task 3: Sync + edição na ficha

- [ ] `syncClientContractServices(clientId, services)`
- [ ] Aba Contrato editável em `client-detail-view.tsx`
- [ ] Labels de periodicidade na lista
- [ ] `npx tsc --noEmit`
