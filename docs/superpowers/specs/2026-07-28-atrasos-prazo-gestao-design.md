# Atrasos permanentes + alteração de prazo pela gestão

**Data:** 2026-07-28  
**Status:** Aprovada em chat (seções 1–2)  
**Fatia:** C — operacional (após Meu Painel + wizard cliente)  
**Relacionada:** Prompt 3 (Captações, Projetos e Atrasos; Indicadores e Ações da Gestão)

## Problema

Hoje o atraso é **calculado em tempo real** (`dueDate < now` e status não terminal). Quando a demanda é concluída ou o prazo é prorrogado, o indicador some — contrariando o PRD:

> Os atrasos devem ser registrados de forma permanente (gravando o prazo original, data real e impacto), e não devem desaparecer após a conclusão da atividade.

Também falta fluxo formal para a gestão alterar prazos com justificativa (Prompt 2: data protegida após demanda; Prompt 3: gestão corrige com justificativa formal). Existe `AuditAction.DEADLINE_CHANGED` e permissão `demands.change_deadline`, mas sem UI nem serviço dedicado.

## Objetivo (escopo desta fatia)

1. **Registrar episódios de atraso** de forma permanente no banco.
2. **Gestão altera prazos** (`dueDate`, `demandDeadline`, `publishDate`) com justificativa obrigatória.
3. **Painel e cartões** exibem histórico de atrasos e permitem correção de prazo (quem tem permissão).

**Fora de escopo:** correção de `WorkSession`/cronômetro; job cron em produção (detecção híbrida on-read é suficiente na 1ª entrega); relatório PDF; notificações novas de atraso.

## Decisão

**Abordagem 1 — modelo `DemandDelay` + detecção híbrida + action de prazo com audit.**

Rejeitadas: só `AuditLog` (KPIs frágeis); JSON em `Demand` (queries ruins).

## Arquitetura

```
syncDemandDelays(demandIds?)
  └─ para cada demanda elegível com prazo efetivo < now
       └─ upsert episódio ABERTO (1 por demanda)
  └─ ao concluir/publicar demanda
       └─ fecha episódio aberto → resolution COMPLETED

changeDemandDeadlineAction(...)
  └─ requirePermission demands.change_deadline
  └─ justification min 10 chars
  └─ update Demand.{dueDate|demandDeadline|publishDate}
  └─ logAudit DEADLINE_CHANGED { field, previous, new, justification }
  └─ fecha episódio aberto → DEADLINE_EXTENDED
  └─ revalidate paths operacionais

Chamadas syncDemandDelays:
  - getSectorBoardData (após query)
  - getBoardViewData / quadro cliente
  - getManagementOverview
```

### Prazo efetivo

`effectiveDeadline = demand.demandDeadline ?? demand.dueDate` (mesma regra de `priority.service.ts`).

Demanda **elegível** a atraso: `effectiveDeadline` definido, status ∉ `{ DONE, CANCELLED, PUBLISHED }`, `effectiveDeadline < now`.

### Modelo `DemandDelay`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | cuid | PK |
| `demandId` | FK Demand | |
| `clientId` | FK Client | denormalizado para queries do painel |
| `originalDueDate` | DateTime | snapshot no momento da detecção |
| `detectedAt` | DateTime | default now |
| `resolvedAt` | DateTime? | null = episódio aberto |
| `resolution` | enum | `COMPLETED` \| `DEADLINE_EXTENDED` \| `CANCELLED` |
| `daysOverdue` | Int | calculado na resolução (ou atualizado enquanto aberto) |

**Regras:**
- Máximo **um episódio aberto** por `demandId` (`@@unique([demandId])` onde `resolvedAt IS NULL` — implementar via findFirst + constraint lógica ou partial unique se suportado; senão validação no serviço).
- Novo episódio só após fechar o anterior e a demanda voltar a estar em atraso.
- `CANCELLED` ao cancelar demanda.

### Enum `DemandDelayResolution`

```
COMPLETED | DEADLINE_EXTENDED | CANCELLED
```

### Alteração de prazo

**Action:** `changeDemandDeadlineAction({ demandId, clientId, field, newDate, justification })`

| Campo | Editável | Notas |
|-------|----------|-------|
| `dueDate` | Sim | prazo canônico interno |
| `demandDeadline` | Sim | prazo do setor |
| `publishDate` | Sim | recalcula `demandDeadline` se política existir em `cards.service` (opcional: só gravar publishDate) |

Validações:
- `justification.trim().length >= 10`
- `newDate` válida
- usuário com `demands.change_deadline` (Gestão/Admin no seed)

Audit `newValue`: `{ field, previous: ISO, new: ISO, justification }`.

## UI

### Componente compartilhado `DeadlineChangeForm`

Props: `demandId`, `clientId`, `dueDate`, `demandDeadline`, `publishDate`, `canChangeDeadline`.

- Inputs `date`/`datetime-local` por campo
- Textarea justificativa (obrigatória)
- Botão "Salvar prazo"
- Toast sucesso/erro

### Onde montar

| Local | Quem vê |
|-------|---------|
| `components/board/card-detail-sheet.tsx` | Gestão no quadro do cliente |
| `components/sector/sector-card-sheet.tsx` | Gestão no setor |
| Nova seção em `components/board/` ou `components/shared/` | `DemandDelayHistory` — lista episódios do cartão |

### Histórico no cartão (`DemandDelayHistory`)

Tabela compacta: prazo original, detectado em, dias em atraso, resolução, data resolução.  
Episódios fechados permanecem visíveis após conclusão.

### Painel de Gestão (`app/(agency)/painel-gestao/page.tsx`)

- Novo KPI: **Atrasos no mês** — count de episódios com `detectedAt` no mês corrente (abertos + fechados).
- Card **Últimos atrasos** — 5–8 episódios recentes com cliente, demanda, dias, status (aberto/resolvido), link para quadro/setor.

Badge **Atrasada** em `DemandCard` permanece dinâmico (UX atual); histórico é complementar.

## Serviços e arquivos

| Arquivo | Responsabilidade |
|---------|------------------|
| `prisma/schema.prisma` | `DemandDelay`, enum, relações em `Demand`/`Client` |
| `lib/services/delay.service.ts` | `syncDemandDelays`, `resolveDemandDelay`, `listDemandDelays`, KPIs |
| `lib/actions/deadline.actions.ts` | `changeDemandDeadlineAction` |
| `components/shared/deadline-change-form.tsx` | UI alteração |
| `components/shared/demand-delay-history.tsx` | UI histórico |
| `lib/revalidate-operational.ts` | paths se necessário |
| `prisma/seed.ts` | 2–3 demandas com episódios (aberto + fechado) |
| `lib/agency/audit-labels.ts` | label se faltar |

Integrar `syncDemandDelays` em:
- `lib/services/sector-board.service.ts`
- `lib/services/board.service.ts` (ou loader do quadro cliente)
- `lib/services/management.service.ts`

Ao marcar demanda `DONE`/`PUBLISHED`/`CANCELLED`: chamar `resolveDemandDelay` no serviço de cards/assignment existente (ponto único preferível: helper em `delay.service` invocado de `cards.actions` / fluxo de conclusão).

## Aceite

1. Demanda com prazo passado gera episódio `DemandDelay` ao abrir quadro/setor/painel.
2. Concluir demanda atrasada fecha episódio com `COMPLETED`; registro **permanece** no histórico do cartão.
3. Gestão altera `dueDate` com justificativa → audit `DEADLINE_CHANGED` + episódio `DEADLINE_EXTENDED`.
4. Colaborador sem `demands.change_deadline` **não** vê formulário de alteração de prazo.
5. Painel de Gestão mostra KPI de atrasos no mês e lista recentes.
6. `npx tsc --noEmit` limpo; `npm run db:seed` OK.

## Smoke (senha `Samps@2026`)

| Usuário | Rota | Checar |
|---------|------|--------|
| `gestao@samps.digital` | `/painel-gestao` | KPI atrasos + lista |
| `gestao@samps.digital` | `/clientes/[id]/quadro` → cartão atrasado | Histórico + alterar prazo |
| `designer@samps.digital` | `/meu-painel/design` | Sem formulário de prazo |
| Após concluir cartão atrasado | histórico do cartão | Episódio `COMPLETED` visível |

## Fora de escopo

- Correção de tempo de `WorkSession`
- Cron job dedicado (futuro)
- Algoritmo de impacto além de `daysOverdue`
- Portal do cliente (nunca vê atrasos)
