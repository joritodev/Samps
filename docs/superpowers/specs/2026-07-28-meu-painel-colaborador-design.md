# Meu Painel — fila do setor + demandas do colaborador

**Data:** 2026-07-28  
**Status:** Aprovada em chat  
**Fatia:** A (painéis/demandas antes do wizard completo de cliente)  
**Relacionada:** PR #4 (colaboradores redirecionados ao Meu Painel; Setores oculto)

## Problema

Colaboradores operacionais (`DESIGNER`, `VIDEOMAKER`, `VIDEO_EDITOR`, `OTHER`/tráfego) não veem `/setores` (decisão de produto). O Meu Painel chama `getSectorBoardData(slug, { assigneeId: user.id })`, que **só** retorna demandas já atribuídas.

Demandas distribuídas ao setor ficam com `DemandAssignment.status = AVAILABLE` e `assigneeId = null`. Elas apareciam em `/setores/*`, mas colaboradores são redirecionados — **não conseguem ver nem assumir a fila**.

Efeitos colaterais:
- Kanban vazio para parte do seed (demandas sem `DemandAssignment`)
- Tráfego demo sem cards no Meu Painel
- Notificações deep-link sem tráfego/social
- `revalidatePath` sem `/meu-painel/trafego`

## Objetivo

Cada colaborador de setor (design, vídeo, tráfego) usa **Meu Painel** como ambiente principal e consegue:

1. Ver a **fila disponível** do seu setor
2. **Assumir** demandas (fluxo existente em `SectorCardSheet` / `claimDemand`)
3. Ver e executar **suas** demandas nas colunas operacionais
4. Líder do setor vê fila completa no Meu Painel (substitui acesso perdido a `/setores` para gestão da fila)

**Social Media** mantém escopo atual (`getSocialBoardData` com carteira de clientes) — fora desta fatia salvo correções de link/revalidate.

## Decisão

**Abordagem 1 — Meu Painel híbrido:** reutilizar `SectorBoardView` + estender `getSectorBoardData` com modo `collaborator`. Sem reabrir `/setores` para colaboradores.

## Arquitetura

```
meu-painel/{design|video|trafego}/page.tsx
  └─ getSectorBoardData(slug, { mode: "collaborator", userId, leaderFullView? })
       └─ query: fila AVAILABLE do setor ∪ demandas assigneeId === user
       └─ group: coluna "available" = pool; demais colunas = só minhas
       └─ SectorBoardView (inalterado na UI estrutural)
```

### Modos de `getSectorBoardData`

| Modo | Uso | Query |
|------|-----|-------|
| `sector` (default) | `/setores/[slug]` gestão | Todas as demandas do setor |
| `collaborator` | Meu Painel design/vídeo/tráfego | Pool AVAILABLE + minhas (`assigneeId === userId`) |
| `collaborator` + `leaderFullView` | Líder do setor no Meu Painel | Igual `sector` (fila completa para atribuir) |

### Regras de agrupamento (modo collaborator)

| Coluna | Conteúdo |
|--------|----------|
| Demandas disponíveis | `AssignmentStatus.AVAILABLE` ou `DEMANDED` sem assignment ativo |
| Em produção / Revisão / Ajustes / Concluídas hoje | Somente `assigneeId === userId` (exceto leaderFullView: todas) |

### Fallback de agrupamento (seed + legado)

Se demanda tem `assigneeId` e status operacional (`IN_PRODUCTION`, `IN_REVIEW`, `ADJUSTMENTS`) mas **sem** `DemandAssignment`, mapear para a coluna coerente com `DemandStatus` — evita kanban vazio.

### Correções auxiliares (mesma fatia)

- `lib/revalidate-operational.ts` — incluir `/meu-painel/trafego`
- `lib/services/assignment.service.ts` — link de notificação via `getPersonalPanelPath` + slug do setor
- `types/auth.ts` — helper `getPanelPathForSectorSlug(slug)` se necessário
- Páginas `meu-painel/*` — redirect se `userType` não corresponde ao painel (ex.: designer em `/meu-painel/social`)
- `prisma/seed.ts` — `DemandAssignment` coerente; tráfego com demanda disponível ou atribuída

## Fora de escopo (fatia B — wizard cliente)

- Campos extras do wizard (email, telefone, logo, notas, responsáveis, datas contrato)
- Portal externo / aprovação do cliente
- Registro permanente de atrasos
- Cronômetro live sync entre painéis
- Reabrir aba Setores para colaboradores normais

## Aceite

1. Login `designer@samps.digital` → Meu Painel design mostra coluna **Disponíveis** com demandas do setor + cards atribuídos ao designer.
2. Clicar **Assumir** em demanda disponível → card move para **Em produção** (visível só para quem assumiu).
3. Login `trafego@samps.digital` → Meu Painel tráfego **não vazio** (seed).
4. Líder do setor (ex.: designer líder) → Meu Painel mostra fila completa + pode atribuir (`canAssign`).
5. Gestão → `/setores` inalterado; distribuição pós-briefing popula fila no Meu Painel do setor.
6. Login designer não acessa `/meu-painel/video` (redirect ao painel correto).
7. `npx tsc --noEmit` limpo.

## Smoke (senha `Samps@2026`)

| Usuário | Rota | Checar |
|---------|------|--------|
| `designer@samps.digital` | `/meu-painel/design` | Disponíveis + assumir |
| `trafego@samps.digital` | `/meu-painel/trafego` | ≥1 card |
| `gestao@samps.digital` | `/setores/design` | Quadro gestão OK |
| Social demanda → design | — | Aparece em design Disponíveis |
