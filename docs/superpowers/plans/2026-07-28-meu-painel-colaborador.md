# Meu Painel Colaborador Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Colaboradores de setor veem fila disponível + suas demandas no Meu Painel e conseguem assumir trabalho sem acessar `/setores`.

**Architecture:** Estender `getSectorBoardData` com `mode: "collaborator"` (query híbrida + agrupamento por coluna). Páginas Meu Painel passam `userId` e `leaderFullView`. Seed e helpers corrigem demo e revalidação.

**Tech Stack:** Next.js App Router, Prisma, `SectorBoardView`, serviços existentes `assignment.service` / `distribution.service`.

**Spec:** [`docs/superpowers/specs/2026-07-28-meu-painel-colaborador-design.md`](../specs/2026-07-28-meu-painel-colaborador-design.md)

## Global Constraints

- Não reabrir `/setores` para colaboradores normais (`isSectorCollaborator` permanece)
- Social Meu Painel: manter `getSocialBoardData({ individual: true })` — só fixes de link/revalidate se tocado
- Commits only if user asks
- Verify: `npx tsc --noEmit`
- Subagents mecânicos: `composer-2.5-fast`

---

## File map

| File | Responsibility |
|------|----------------|
| Modify: `lib/services/sector-board.service.ts` | Modos `sector` / `collaborator`, query + grouping |
| Modify: `app/(agency)/meu-painel/design/page.tsx` | Chamar modo collaborator + guard userType |
| Modify: `app/(agency)/meu-painel/video/page.tsx` | Idem |
| Modify: `app/(agency)/meu-painel/trafego/page.tsx` | Idem |
| Modify: `app/(agency)/meu-painel/social/page.tsx` | Guard userType only |
| Modify: `types/auth.ts` | `getPanelPathForSectorSlug` (notifications) |
| Modify: `lib/services/assignment.service.ts` | Deep-link notificação por setor |
| Modify: `lib/revalidate-operational.ts` | `/meu-painel/trafego` |
| Modify: `prisma/seed.ts` | `DemandAssignment` rows + tráfego demo |

---

### Task 1: `getSectorBoardData` — modo collaborator

**Files:**
- Modify: `lib/services/sector-board.service.ts`

**Interfaces:**
- Consumes: `SectorSlug`, `SessionUser.id`, `sector.leaderId`
- Produces:
  ```ts
  getSectorBoardData(
    slug: SectorSlug,
    options?: {
      mode?: "sector" | "collaborator";
      userId?: string;
      leaderFullView?: boolean;
    }
  )
  ```
  Back-compat: `{ assigneeId: string }` → tratar como `mode: "collaborator", userId: assigneeId` (deprecar assigneeId-only após migrar pages).

- [ ] **Step 1: Tipar opções e query**

Substituir filtro `assigneeId`-only por:

```ts
export type SectorBoardMode = "sector" | "collaborator";

function buildSectorDemandWhere(
  sectorId: string,
  options?: {
    mode?: SectorBoardMode;
    userId?: string;
    leaderFullView?: boolean;
  }
): Prisma.DemandWhereInput {
  const base = {
    sectorId,
    status: { notIn: [DemandStatus.CANCELLED] },
  };

  if (options?.mode !== "collaborator" || !options.userId) {
    return base;
  }

  if (options.leaderFullView) {
    return base;
  }

  const userId = options.userId;
  return {
    ...base,
    OR: [
      { assigneeId: userId },
      {
        assignments: {
          some: {
            sectorId,
            status: AssignmentStatus.AVAILABLE,
          },
        },
      },
      {
        assigneeId: null,
        status: DemandStatus.DEMANDED,
      },
    ],
  };
}
```

- [ ] **Step 2: Agrupamento collaborator**

Após `enriched`, no loop de `grouped`:

```ts
const isCollaborator = options?.mode === "collaborator" && options.userId && !options.leaderFullView;
const userId = options.userId;

function isAvailablePool(d: typeof enriched[0]) {
  const assignment = d.assignments[0];
  const status = assignment?.status;
  if (status === AssignmentStatus.AVAILABLE) return true;
  if (!assignment && d.status === DemandStatus.DEMANDED) return true;
  return false;
}

function isMine(d: typeof enriched[0]) {
  return d.assigneeId === userId;
}

// inside for (const d of enriched):
if (isCollaborator) {
  if (isAvailablePool(d)) grouped.available.push(d);
  if (!isMine(d)) continue; // skip other columns for non-mine
}
// existing column logic for mine / sector mode...
```

- [ ] **Step 3: Fallback DemandStatus → coluna**

Quando `!assignment && d.assigneeId` e status operacional:

```ts
if (!assignment && d.assigneeId) {
  if (d.status === DemandStatus.IN_PRODUCTION) grouped.production.push(d);
  else if (d.status === DemandStatus.IN_REVIEW) grouped.review.push(d);
  else if (d.status === DemandStatus.ADJUSTMENTS) grouped.adjustments.push(d);
}
```

Aplicar só se ainda não entrou em nenhuma coluna (evitar duplicata).

- [ ] **Step 4: KPIs em collaborator**

- `available` / `unassigned`: contar só pool (já em `grouped.available`)
- `inProduction`, `inReview`, `adjustments`, `doneToday`: contar só `isMine(d)` quando collaborator
- Top 5: manter recorte às demandas visíveis (`enriched`)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`  
Expected: PASS

---

### Task 2: Wire Meu Painel pages + guards

**Files:**
- Modify: `app/(agency)/meu-painel/design/page.tsx`
- Modify: `app/(agency)/meu-painel/video/page.tsx`
- Modify: `app/(agency)/meu-painel/trafego/page.tsx`
- Modify: `app/(agency)/meu-painel/social/page.tsx`

**Interfaces:**
- Consumes: `getSectorBoardData(slug, { mode, userId, leaderFullView })`, `getDashboardPath`, `UserType`

- [ ] **Step 1: Helper guard (inline ou `lib/agency/panel-access.ts`)**

```ts
import { redirect } from "next/navigation";
import { UserType } from "@prisma/client";
import { getDashboardPath } from "@/types/auth";

const PANEL_USER_TYPES: Record<string, UserType[]> = {
  design: ["DESIGNER"],
  video: ["VIDEOMAKER", "VIDEO_EDITOR"],
  trafego: ["OTHER"],
  social: ["SOCIAL_MEDIA"],
};

export function requirePanelUserType(
  slug: keyof typeof PANEL_USER_TYPES,
  userType: UserType
) {
  if (!PANEL_USER_TYPES[slug].includes(userType)) {
    redirect(getDashboardPath(userType));
  }
}
```

- [ ] **Step 2: design/page.tsx**

```ts
requirePanelUserType("design", user.userType);
const leaderFullView = data.sector.leaderId === user.id;
const data = await getSectorBoardData("design", {
  mode: "collaborator",
  userId: user.id,
  leaderFullView,
});
```

Atualizar `description` para: `"Fila do setor e demandas atribuídas a você"`.

Repetir para `video` (`"video"`) e `trafego` (`"trafego"`).

- [ ] **Step 3: social/page.tsx**

Apenas `requirePanelUserType("social", user.userType)` — sem mudar data fetch.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`  
Expected: PASS

---

### Task 3: Notificações + revalidate

**Files:**
- Modify: `types/auth.ts`
- Modify: `lib/services/assignment.service.ts`
- Modify: `lib/revalidate-operational.ts`

- [ ] **Step 1: `getPanelPathForSectorSlug` em `types/auth.ts`**

```ts
export function getPanelPathForSectorSlug(slug: string): string {
  if (slug === "social" || slug === "social-media") return "/meu-painel/social";
  if (slug === "video") return "/meu-painel/video";
  if (slug === "trafego") return "/meu-painel/trafego";
  return "/meu-painel/design";
}
```

- [ ] **Step 2: assignment.service notification link**

Substituir ternário design/video por:

```ts
const sector = await db.sector.findUnique({ where: { id: demand.sectorId } });
const link = sector?.slug
  ? getPanelPathForSectorSlug(sector.slug)
  : "/demandas";
```

- [ ] **Step 3: revalidate-operational.ts**

Adicionar: `revalidatePath("/meu-painel/trafego");`

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`  
Expected: PASS

---

### Task 4: Seed — assignments + tráfego demo

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Após criar demandas de setor, criar `DemandAssignment`**

Para cada demanda com `sectorId` e status operacional, inserir assignment coerente:

| DemandStatus | AssignmentStatus |
|--------------|------------------|
| DEMANDED, sem assignee | AVAILABLE |
| DEMANDED/IN_PRODUCTION com assignee | ASSIGNED ou IN_PROGRESS |
| IN_REVIEW | IN_REVIEW |
| ADJUSTMENTS | ADJUSTMENT |

Usar `upsert` ou loop pós-`createMany` com mapa `demandId → assignment`.

- [ ] **Step 2: Tráfego**

Garantir pelo menos uma das opções para `trafegoUser`:
- Campanha Meta Ads: `DemandAssignment` AVAILABLE **ou**
- `assigneeId: trafegoUser.id` + ASSIGNED

- [ ] **Step 3: Reseed local (dev)**

Run: `npm run db:seed`  
Expected: seed completa sem erro

---

### Task 5: Aceite manual

- [ ] **Step 1: Smoke designer**

Login `designer@samps.digital` → `/meu-painel/design` → coluna Disponíveis + Assumir

- [ ] **Step 2: Smoke tráfego**

Login `trafego@samps.digital` → `/meu-painel/trafego` → ≥1 card

- [ ] **Step 3: Smoke gestão**

Login `gestao@samps.digital` → `/setores/design` → quadro completo

- [ ] **Step 4: Typecheck final**

Run: `npx tsc --noEmit`  
Expected: PASS

- [ ] **Step 5: Commit (se usuário pedir)**

```bash
git add lib/services/sector-board.service.ts app/(agency)/meu-painel/ types/auth.ts lib/services/assignment.service.ts lib/revalidate-operational.ts prisma/seed.ts docs/superpowers/
git commit -m "$(cat <<'EOF'
feat(meu-painel): fila do setor e demandas do colaborador

Colaboradores veem demandas disponíveis e assumem no Meu Painel sem acessar /setores. Seed, revalidate e links de notificação alinhados.
EOF
)"
```
