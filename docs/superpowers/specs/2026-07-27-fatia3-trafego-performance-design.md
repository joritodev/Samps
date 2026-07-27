# Fatia 3 (núcleo) — Meu painel Tráfego + Performance real

**Data:** 2026-07-27  
**Status:** spec aprovada; plano em `docs/superpowers/plans/2026-07-27-fatia3-trafego-performance.md`  
**Escopo:** opção A — núcleo operacional, sem Agenda e sem polish dark global

## Contexto

As Fatias 1 e 2 do Prompt 3 já estão na agency:

- Quadros `/setores/design|video|trafego|social` com `SectorBoardView`
- Painéis `/meu-painel/design|video|social`
- Gestão enriquecida + notificações

Faltam no núcleo da Fatia 3:

1. Painel individual de tráfego
2. Performance com dados reais (hoje mock em `performance-dashboard.tsx`)
3. Ajustes de navegação/seed para o usuário de tráfego

## Decisões

| Tema | Decisão |
|------|---------|
| Abordagem | Reuso máximo (padrão design/vídeo + `getIndicators`) |
| Login `OTHER` | Continua em `/setores/trafego` (`getDashboardPath`) |
| Meu Painel | Sidebar aponta `/meu-painel/trafego` para `userType === "OTHER"` |
| Performance | Substituir mock; não inventar SLA/% sem fonte |
| Seed | Renomear usuário tráfego para **Rafael Alves**; manter email `trafego@samps.digital` |
| Fora | Agenda mock, dark polish global, stubs de configurações |

## 1. Meu painel — Tráfego

### Rota

Criar `app/(agency)/meu-painel/trafego/page.tsx` espelhando `meu-painel/design/page.tsx`:

- `requireAuth()`
- `getSectorBoardData("trafego", { assigneeId: user.id })`
- `listSectorUsers` + `canAssign` (permissão `demands.assign` ou `leaderId`)
- `SectorBoardView` com título **"Meu painel — Tráfego"** e descrição de demandas atribuídas/assumidas

Layout: `flex h-full min-h-0 flex-col overflow-hidden p-4 sm:p-6` (mesmo das outras).

### Navegação

Em `components/agency/agency-sidebar.tsx` → `panelNavForUser`:

```ts
case "OTHER":
  return [{ href: "/meu-painel/trafego", label: "Meu Painel", icon: ListTodo }];
```

Não alterar o redirect pós-login de `OTHER` (já é `/setores/trafego`).

### Seed

Em `prisma/seed.ts`, usuário `trafego@samps.digital`:

- `name`: de `"Bruno Alves"` → `"Rafael Alves"`
- Manter `userType: OTHER`, `sectorId: trafego`, líder do setor, link com Bella, demanda demo de tráfego já existente

## 2. Performance real

### Dados

Reutilizar `lib/services/indicators.service.ts` → `getIndicators({ period, userId?, sectorId? })`.

Escopo na page (igual `(app)/relatorios`):

- `ADMIN` / `MANAGEMENT`: sem filtro de user/setor (visão consolidada)
- Demais: `userId: user.id` e, se houver, `sectorId: user.sectorId`

Carregar em paralelo: `today`, `week`, `month`.

### UI

Substituir o client component mock por uma UI alimentada por props (server page passa os três períodos):

**KPIs por período (cards):**

- Concluídas
- Em produção
- Atrasadas
- Ajustes
- Sessões de trabalho
- Tempo trabalhado (horas, 1 casa decimal)
- Tempo médio por sessão (horas)

**Não incluir** nesta entrega:

- Taxa de conclusão %, SLA %, gráficos Recharts sem série real por setor

Tokens: `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground` (compatível com dark).

Permissão: manter `requirePermission("productivity.view")` em `app/(agency)/performance/page.tsx`.

Arquivos:

- Preferência: reescrever `components/agency/performance-dashboard.tsx` para receber props tipadas (sem mock)
- Ou page server renderizar `StatCard`s diretamente e aposentar o dashboard mock — escolha na implementação: **preferir props no dashboard** para preservar título/layout da página

## 3. Aceite

1. Login `trafego@samps.digital` / `Samps@2026` → `/setores/trafego`
2. Sidebar mostra **Meu Painel** → `/meu-painel/trafego` com só demandas do executor
3. Assumir/iniciar/concluir no quadro geral continua sincronizado no meu-painel
4. `/performance` (gestão) mostra números coerentes com o banco (não 87%/3,4 dias mock)
5. Após `npm run db:seed`, usuário aparece como **Rafael Alves**
6. `npx tsc --noEmit` sem erros novos

## Fora de escopo

- Agenda com eventos reais
- Visualização Lista nos setores
- Registro permanente de atrasos
- Ações de gestão com justificativa de tempo
- Dark mode em sheets sociais / ambers fixos
- Relatórios em rota separada `/relatorios` na agency (Performance cobre o núcleo)

## Dependências existentes

- `getSectorBoardData` / `SectorBoardView` / `listSectorUsers`
- `getIndicators`
- `StatCard`, tokens de tema agency
- Seed com setor `trafego` e demanda demo
