# Fatia 3.3 — Categorias de vídeo configuráveis + briefing obrigatório por tipo

> **For agentic workers:** use superpowers:subagent-driven-development task-a-task. Metodologia: SDD. Controller Opus; implementer mid.

**Goal:** remover a lista hardcoded de categorias de vídeo (`VIDEO_DEMO_CONTENT_TYPE_SLUGS`); tornar os campos obrigatórios do briefing configuráveis por `ContentType`; bloquear criação/demanda quando campos obrigatórios do tipo escolhido estiverem faltando.

**Branch:** `feat/categorias-video-briefing` a partir de `master` (após merge dos PRs anteriores).  
**Gate:** Bugbot (lógica de negócio). Security Review não obrigatório (sem auth/upload novo).

---

## Estado atual

- `ContentType` tem `id, name, slug, isActive, sortOrder`. Nenhum campo de briefing.
- `lib/agency/video-demo-briefing.ts` — lista hardcoded `VIDEO_DEMO_CONTENT_TYPE_SLUGS`; função `videoDemoMissingFields` valida `durationSeconds`, `format`/`orientation`.
- Callers: `lib/services/cards.service.ts:121` (`completeBriefingAndDemand`) e `lib/agency/demand-cycle.ts:165` (smoke de ciclo).
- `lib/services/settings.service.ts` tem CRUD completo para `ContentType`: `listContentTypes`, `upsertContentType`, `toggleActive`.
- Settings page: `app/(agency)/configuracoes/tipos/page.tsx` usa componente genérico com `kind="contentType"`.

## Decisões de design

| Decisão | Escolha |
|---------|---------|
| Onde ficam os flags | Colunas booleanas em `ContentType` (`requiresDuration`, `requiresFormat`, `requiresCaption`, `requiresReference`, `requiresRawDelivery`) |
| Campos cobertos | `durationSeconds`, `format`/`orientation`, `caption` (legenda), `reference` (referência), `rawDelivery` (entrega bruta) |
| Lógica de validação | `lib/agency/content-type-requirements.ts` (puro, testado) substitui `videoDemoMissingFields` |
| O que acontece com os tipos de demo | Continuam existindo como `ContentType` no banco; só perdem a necessidade de slug hardcoded |
| Telas de criação de demanda | Campos de vídeo aparecem quando `ContentType` tiver algum `requires* = true` |

## Global Constraints

- Não mudar a coluna `format` de `Demand` (é usada para orientação e formato de carrossel).
- `requiresFormat` em `ContentType` controla só a exibição/validação do campo `format` no briefing de vídeo.
- Conventional Commits em português; 1 commit por task com `tsc` e `npm test` limpos.
- Sem `unsafe-eval` no plano; sem `db.checklistItem` nesta fatia.
- `videoDemoMissingFields` pode ser deprecated mas não removida nesta fatia (mantém retrocompatibilidade no `demand-cycle.ts`).

---

## File map

| Arquivo | Papel |
|---------|-------|
| `prisma/schema.prisma` | 5 colunas boolean em `ContentType` |
| `prisma/migrations/20260925<ts>_content_type_requirements/` | migration |
| `lib/agency/content-type-requirements.ts` | função pura `missingBriefingFields(contentType, data)` + testes |
| `lib/agency/content-type-requirements.test.ts` | testes TDD |
| `lib/services/settings.service.ts` | `upsertContentType` aceita os 5 novos campos |
| `lib/services/cards.service.ts` | `completeBriefingAndDemand`: substituir `videoDemoMissingFields` por `missingBriefingFields` (precisa buscar `ContentType` com campos requires*) |
| `app/actions/settings.actions.ts` | action de upsert de ContentType expõe os novos campos |
| `app/(agency)/configuracoes/tipos/page.tsx` | UI de listagem mostra checkboxes de campos obrigatórios |
| `components/agency/content-type-requirements-form.tsx` | formulário inline de edição de requires* |

---

### Task 1: Schema + migration (TDD — escrever testes antes do código)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260925130000_content_type_requirements/migration.sql`
- Create: `lib/agency/content-type-requirements.ts`
- Create: `lib/agency/content-type-requirements.test.ts`

**Interfaces:**

```ts
// lib/agency/content-type-requirements.ts

export type ContentTypeRequirements = {
  requiresDuration: boolean;
  requiresFormat: boolean;
  requiresCaption: boolean;
  requiresReference: boolean;
  requiresRawDelivery: boolean;
};

export type BriefingInput = {
  durationSeconds?: number | null;
  format?: string | null;
  orientation?: string | null;
  caption?: string | null;
  reference?: string | null;
  rawDelivery?: boolean | null;
};

/** Retorna lista de labels dos campos que faltam. Vazio = válido. */
export function missingBriefingFields(
  requirements: ContentTypeRequirements,
  input: BriefingInput
): string[];
```

- [ ] **Step 1: Adicionar colunas a `ContentType` em `prisma/schema.prisma`**

```prisma
model ContentType {
  // ... campos existentes ...
  requiresDuration   Boolean @default(false)
  requiresFormat     Boolean @default(false)
  requiresCaption    Boolean @default(false)
  requiresReference  Boolean @default(false)
  requiresRawDelivery Boolean @default(false)
}
```

- [ ] **Step 2: Gerar migration manual**

```sql
-- prisma/migrations/20260925130000_content_type_requirements/migration.sql
ALTER TABLE "ContentType" ADD COLUMN "requiresDuration" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ContentType" ADD COLUMN "requiresFormat" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ContentType" ADD COLUMN "requiresCaption" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ContentType" ADD COLUMN "requiresReference" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ContentType" ADD COLUMN "requiresRawDelivery" BOOLEAN NOT NULL DEFAULT false;
```

Criar arquivo `migration.sql` no diretório acima. Rodar `npx prisma migrate deploy` OU `npx prisma db push` em dev.

- [ ] **Step 3: Escrever os testes (TDD)**

```ts
// lib/agency/content-type-requirements.test.ts
import { describe, expect, it } from "vitest";
import { missingBriefingFields } from "./content-type-requirements";

const noRequirements = {
  requiresDuration: false, requiresFormat: false,
  requiresCaption: false, requiresReference: false, requiresRawDelivery: false,
};

describe("missingBriefingFields", () => {
  it("retorna vazio quando nenhum campo e obrigatorio", () => {
    expect(missingBriefingFields(noRequirements, {})).toEqual([]);
  });

  it("retorna duracao quando requiresDuration e falta durationSeconds", () => {
    const req = { ...noRequirements, requiresDuration: true };
    expect(missingBriefingFields(req, { durationSeconds: null })).toContain("duração (segundos)");
  });

  it("nao retorna duracao quando durationSeconds preenchido", () => {
    const req = { ...noRequirements, requiresDuration: true };
    expect(missingBriefingFields(req, { durationSeconds: 30 })).toEqual([]);
  });

  it("retorna formato quando requiresFormat e falta format e orientation", () => {
    const req = { ...noRequirements, requiresFormat: true };
    expect(missingBriefingFields(req, {})).toContain("formato/orientação");
    expect(missingBriefingFields(req, { format: "9:16" })).toEqual([]);
  });

  it("retorna legenda quando requiresCaption e falta caption", () => {
    const req = { ...noRequirements, requiresCaption: true };
    expect(missingBriefingFields(req, { caption: null })).toContain("legenda");
    expect(missingBriefingFields(req, { caption: "Sim" })).toEqual([]);
  });

  it("acumula varios campos ausentes", () => {
    const req = { requiresDuration: true, requiresFormat: true, requiresCaption: true, requiresReference: false, requiresRawDelivery: false };
    const gaps = missingBriefingFields(req, {});
    expect(gaps).toHaveLength(3);
  });
});
```

- [ ] **Step 4: Implementar `missingBriefingFields`** — todos os testes devem passar.

- [ ] **Step 5: `npx tsc --noEmit` e `npm test` — limpos**

- [ ] **Step 6: commit**

```
feat(schema): adiciona requires* em ContentType para briefing configuravel
```

---

### Task 2: Atualizar service e action de ContentType

**Files:**
- Modify: `lib/services/settings.service.ts`
- Modify: `app/actions/settings.actions.ts` (se existir action de upsert)

- [ ] **Step 1: Atualizar `upsertContentType`** para aceitar e persistir os 5 novos campos:

```ts
input: {
  id?: string;
  name: string;
  slug?: string;
  sortOrder?: number;
  isActive?: boolean;
  requiresDuration?: boolean;
  requiresFormat?: boolean;
  requiresCaption?: boolean;
  requiresReference?: boolean;
  requiresRawDelivery?: boolean;
}
```

Incluir os campos no objeto `data` do Prisma se presente no input.

- [ ] **Step 2: `listContentTypes` já retorna todos os campos** — verificar que os novos campos aparecem no retorno (sem mudança necessária se não há `select`).

- [ ] **Step 3: `npx tsc --noEmit` limpo**

- [ ] **Step 4: commit**

```
feat(settings): upsertContentType expoe campos requires* de briefing
```

---

### Task 3: Substituir `videoDemoMissingFields` em `cards.service.ts`

**Files:**
- Modify: `lib/services/cards.service.ts`

A função `completeBriefingAndDemand` já busca o cartão com `contentType: { select: { slug: true } }`. Mudar para incluir os campos `requires*`:

```ts
include: {
  contentType: {
    select: {
      slug: true,
      requiresDuration: true,
      requiresFormat: true,
      requiresCaption: true,
      requiresReference: true,
      requiresRawDelivery: true,
    },
  },
},
```

Substituir o bloco `videoDemoMissingFields(...)` por:

```ts
if (card.contentType) {
  const gaps = missingBriefingFields(card.contentType, {
    durationSeconds: data.durationSeconds ?? card.durationSeconds,
    format: data.format ?? card.format,
    orientation: data.orientation ?? card.orientation,
    caption: (data as { caption?: string }).caption ?? null,
    reference: (data as { reference?: string }).reference ?? null,
    rawDelivery: null,
  });
  if (gaps.length) {
    throw new Error(`Briefing incompleto: preencha ${gaps.join(" e ")}.`);
  }
}
```

Importar `missingBriefingFields` de `@/lib/agency/content-type-requirements`.

- [ ] **Step 1: ajustar include de `contentType` na query**
- [ ] **Step 2: substituir bloco `videoDemoMissingFields`**
- [ ] **Step 3: `npx tsc --noEmit` e `npm test` — limpos**
- [ ] **Step 4: commit**

```
feat(briefing): valida campos obrigatorios por ContentType (substituindo hardcode)
```

---

### Task 4: UI de configuração em `/configuracoes/tipos`

**Files:**
- Modify: `app/(agency)/configuracoes/tipos/page.tsx`
- Create: `components/agency/content-type-requirements-form.tsx`

A tela atual de tipos usa um componente genérico de list + toggle. Adicionar, para cada tipo, uma seção expansível com os 5 checkboxes:

| Campo | Label |
|-------|-------|
| `requiresDuration` | Duração (segundos) obrigatória |
| `requiresFormat` | Formato/orientação obrigatório |
| `requiresCaption` | Legenda obrigatória |
| `requiresReference` | Referência obrigatória |
| `requiresRawDelivery` | Entrega bruta obrigatória |

Ao salvar um checkbox, chamar a action de `upsertContentType` com o campo alterado.

- [ ] **Step 1: Criar `ContentTypeRequirementsForm`** — recebe `contentType` com os 5 campos; chama `updateContentTypeRequirementsAction` por checkbox change.
- [ ] **Step 2: Criar `updateContentTypeRequirementsAction`** — wrapper de `upsertContentType` que recebe só os campos `requires*`.
- [ ] **Step 3: Integrar na página de tipos** — mostrar abaixo de cada tipo o formulário colapsável.
- [ ] **Step 4: `npx tsc --noEmit` limpo**
- [ ] **Step 5: commit**

```
feat(configuracoes): checkboxes de campos obrigatorios por ContentType
```

---

### Task 5: Briefing form — exibir campos condicionais

**Files:**
- Modify: `components/board/card-detail-sheet.tsx` (ou o componente de briefing da demanda)

Quando o cartão tem `contentType` com `requiresDuration = true`, exibir o campo de duração na aba de briefing (já pode existir, só precisa ser condicional).

- [ ] **Step 1: verificar quais campos de vídeo já existem no sheet** — procurar `durationSeconds`, `format`, `orientation` nos campos do briefing.
- [ ] **Step 2: exibir campos de vídeo quando `card.contentType?.requiresDuration` (etc.) for true**, em vez de detectar pelo slug.
- [ ] **Step 3: smoke: criar uma demanda, selecionar ContentType com `requiresDuration = true`; o campo duração deve aparecer; tentar demandar sem preencher deve bloquear.**
- [ ] **Step 4: `npx tsc --noEmit` limpo**
- [ ] **Step 5: commit**

```
feat(briefing): exibe campos condicionais baseado em ContentType.requires*
```

---

## Critério de saída

1. ContentType em `/configuracoes/tipos` permite marcar quais campos são obrigatórios por tipo.
2. Ao demandar uma demanda de um tipo com `requiresDuration = true`, o sistema recusa se `durationSeconds` estiver vazio.
3. Para tipos sem nenhum `requires*`, o comportamento é igual ao de hoje (sem bloqueio de campos de vídeo).
4. `npm test` e `npx tsc --noEmit` limpos.
5. Bugbot no diff aprovado.
