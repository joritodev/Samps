# Fatia 1: fundação do planejamento semanal (schema, RLS, permissões)

**Spec:** `docs/superpowers/specs/2026-10-09-planejamento-semanal-design.md` (seções 2, 3 e 4). **Com schema, permissão e RLS:** desenho fechado aqui; o implementer não improvisa (se precisar fugir, BLOCKED).
**Branch:** `feat/planejamento-fundacao`. **Motor:** SDD (controller Opus; implementer mid-tier). **Gates:** tsc, lint, build, `npm test`, `npm run check:rls`, **Security Review + Bugbot**.
**Não inclui:** lógica de capacidade, serviço, rotas, UI (Fatias 2–6).

## Banco (migração `20261009120000_planning_foundation`)

Todas as tabelas com `id TEXT` (cuid, como o resto do schema), `createdAt`/`updatedAt` quando fizer sentido. Nomes Prisma em PascalCase, como `Goal` e `Absence`.

- Enum `PlanCardStatus`: `NAO_ALOCADO`, `PROGRAMADO`, `EM_EDICAO`, `REVISAO`, `CONCLUIDO`.
- `AuditAction`: `ALTER TYPE ... ADD VALUE IF NOT EXISTS` para `PLAN_CARD_CREATED`, `PLAN_CARD_UPDATED`, `PLAN_CARD_MOVED`, `PLAN_CARD_DELETED`, `PLAN_WEEK_GENERATED`, `PLAN_WEEK_DUPLICATED`, `PLAN_DISTRIBUTION_APPLIED`, `PLAN_SETTINGS_UPDATED`. Em migration separada **antes** (ADD VALUE não pode ser usado na mesma transação em que é criado): `20261009110000_planning_audit_actions`.
- `PlanMember`: `userId` unique → `User` (CASCADE), `sectorId` → `Sector`, `color` (default `#1d4ed8`), `defaultCapacityHours` `DECIMAL(4,2)` default 6, `sortOrder` int, `active` bool. CHECK `defaultCapacityHours BETWEEN 0 AND 24`.
- `PlanTemplate`: `sectorId`, `clientId?` → `Client` (SET NULL), `title`, `kind`, `category`, `durationHours`, `weeklyQuantity` int default 1, `preferredMemberId?` → `PlanMember` (SET NULL), `preferredWeekday?` smallint, `required`, `active`, `sortOrder`. CHECKs: `durationHours > 0 AND <= 24`, `weeklyQuantity >= 1`, `preferredWeekday BETWEEN 1 AND 6`.
- `PlanCard`: `sectorId`, `isoYear` int, `isoWeek` int, `weekday?` smallint, `memberId?` → `PlanMember` (SET NULL), `kind`, `clientId?` → `Client` (SET NULL), `clientName?`, `demandId?` → `Demand` (SET NULL), `templateId?` → `PlanTemplate` (SET NULL), `title`, `category`, `durationHours` `DECIMAL(5,2)`, `status PlanCardStatus` default `NAO_ALOCADO`, `pinned`, `required`, `recurring`, `dueDate?` date, `notes?`, `position` int, `createdById?` → `User` (SET NULL), `createdAt`, `updatedAt`. Índices: `(sectorId, isoYear, isoWeek)`, `(memberId, isoYear, isoWeek)`, `(demandId)`. CHECKs: `weekday BETWEEN 1 AND 6`, `isoWeek BETWEEN 1 AND 53`, `isoYear BETWEEN 2020 AND 2100`, `durationHours > 0 AND <= 24`.
- `PlanDayBlock`: `sectorId`, `isoYear`, `isoWeek`, `weekday`, `memberId?` → `PlanMember` (CASCADE; nulo = setor inteiro), `reason` default `Bloqueado`. Mesmos CHECKs de semana/dia.
- `PlanCapacityOverride`: `memberId` → `PlanMember` (CASCADE), `weekday?`, `isoYear?`, `isoWeek?`, `hours DECIMAL(4,2)`. CHECKs: `hours BETWEEN 0 AND 24`; `(isoYear IS NULL) = (isoWeek IS NULL)`. Unique `(memberId, weekday, isoYear, isoWeek)` tratando NULL (índice único com `COALESCE` ou índices parciais; documentar a escolha no SQL).
- `PlanPreset`: `sectorId`, `label`, `hours DECIMAL(4,2)`, `sortOrder`. Unique `(sectorId, label)`. CHECK `hours > 0`.
- **RLS** (mesmo corpo de `20260824090000_rls_announcement_absence`): `ENABLE` + `FORCE ROW LEVEL SECURITY` + policy `internal_only` (`USING` e `WITH CHECK`) nas 6 tabelas.
- **Permissões:** INSERT em `Permission` com ids `perm_planning_view`, `perm_planning_edit`, `perm_planning_manage` (padrão idempotente `WHERE NOT EXISTS`, como `goals.manage`), e vínculo em `RolePermission` para os papéis (ver tabela abaixo) com o mesmo `CROSS JOIN` idempotente da migration `goals`.

| Código | Rótulo | Papéis que recebem |
|---|---|---|
| `planning.view` | Ver planejamento semanal | todos os papéis internos |
| `planning.edit` | Criar e mover cards no planejamento | papéis internos operacionais (design, vídeo, social, tráfego, gestão) |
| `planning.manage` | Gerenciar planejamento (excluir, equipe, capacidade, modelos) | Gestor/Admin |

> Ao implementar, listar os papéis reais lidos de `prisma/seed.ts` e da migration `goals` e fixar a lista no commit; se um papel não for óbvio → BLOCKED, perguntar.

## Código

- `prisma/schema.prisma`: modelos e enum acima; relações inversas em `User`, `Sector`, `Client`, `Demand`.
- `lib/permissions/codes.ts`: três códigos em `PERMISSION_CODES` e `PERMISSION_LABELS`.
- `lib/agency/permission-groups.ts`: grupo "Planejamento".
- `prisma/seed.ts`: três permissões no Gestor; presets iniciais por setor (**sem** pessoas fixas):
  - Vídeo: "30 minutos" 0,5h; "Reel simples" 1h; "Vídeo intermediário" 2h; "Vídeo complexo" 3h; "Vídeo elaborado" 6h.
  - Design: os 10 rótulos e minutos de `DESIGN_TIME_DEFAULTS` do zip (em horas).
- `lib/agency/audit-labels.ts`: rótulos pt-BR das 8 ações.
- `scripts/check-rls.ts`: para cada uma das 6 tabelas, `withUserScope(cliente.id, tx => tx.<model>.count()) === 0` e gestor enxerga o total (cria 1 linha de teste dentro de transação com rollback, ou usa contagem existente se o seed já criar).
- `docs/superpowers/notas/2026-08-rls.md`: acrescentar as 6 tabelas.

## Tasks

- [ ] 1. Migration de `AuditAction` (`20261009110000_planning_audit_actions`) + rótulos em `audit-labels.ts`. Commit próprio.
- [ ] 2. `schema.prisma` + migration `20261009120000_planning_foundation` (tabelas, CHECKs, índices, RLS, permissões). `npx prisma validate` e `npx prisma generate` limpos; migration aplicada em banco local de teste (`prisma migrate deploy`).
- [ ] 3. Códigos de permissão, rótulos, grupo e seed (permissões + presets). Teste unitário em `lib/permissions/*.test.ts` se existir cobertura de lista de códigos.
- [ ] 4. `check-rls.ts` com as 6 tabelas; `npm run check:rls` verde.
- [ ] 5. Gates: `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm test`. Security Review (`Diff: branch changes`) e Bugbot. PR da fatia.

## Smoke

1. `npx prisma migrate deploy` num banco limpo e num banco com dados (nada existente quebra).
2. `npm run db:seed`: presets por setor criados, permissões presentes, rodar duas vezes não duplica.
3. `npm run check:rls`: externo vê 0 linhas nas 6 tabelas; gestor vê as linhas de teste.
4. Inserir `PlanCard` com `weekday = 7` ou `durationHours = 0` falha pelo CHECK.

## Fora desta fatia (não fazer)

Rotas, sidebar, gate em `types/auth.ts`, serviço, actions e qualquer UI. O item de menu só entra na Fatia 3, quando existir página.
