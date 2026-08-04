# Fase 0 — Recuperar pendências e versionar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam checkbox (`- [ ]`).

**Goal:** Trazer para o versionamento todo o trabalho que hoje só existe em `git stash` (fix de build do deploy, escopo de contrato quantificado, ações da demanda por status) e confirmar que os itens que a reunião assumiu como prontos funcionam de fato.

**Architecture:** Nenhuma arquitetura nova. Três fatias independentes, cada uma com branch, commit e PR próprios, aplicadas na ordem: correção de build (produção primeiro), depois feature de escopo de contrato, depois regra de ações por status.

**Tech Stack:** Next.js 14.2.15, Prisma 6, PostgreSQL (Neon), TypeScript, Tailwind/shadcn, Vercel.

**Modelo sugerido:** `cursor-grok-4.5-high-fast` (tarefas 1–3), `Auto` (tarefa 5). Tarefa 4 é validação manual.

## Global Constraints

- Não existe test runner no repo nesta fase. Verificação = `npx tsc --noEmit`, `npm run lint`, `npm run build` e smoke manual descrito em cada tarefa. Vitest entra na Fase 1.
- Nenhum commit pode conter `.env`, `.env.*`, `.vercel/`, `.superpowers/`, `_e.txt`.
- Conventional Commits em português.
- Um commit por tarefa. `npx tsc --noEmit` limpo antes de cada commit.
- Não rodar `git stash drop` antes de a fatia correspondente estar mergeada.
- Não usar `git checkout .` nem `git reset --hard` enquanto houver trabalho não commitado.

---

## File map

| Arquivo | Responsabilidade | Tarefa |
|---------|------------------|--------|
| `package.json` | `postinstall: prisma generate` para o build da Vercel | 1 |
| `.gitignore` | ignorar `.superpowers/`, `_e.txt` | 1 |
| `.vercelignore` | não enviar `.env`, `.superpowers`, `_e.txt` no deploy | 1 |
| `app/(app)/notificacoes/page.tsx` | remover (rota duplicada com `app/(agency)/notificacoes`) | 1 |
| `lib/agency/contract-services.ts` | periodicidades, mapa slug→DemandType, normalização de linhas | 2 |
| `components/agency/contract-scope-fields.tsx` | UI reutilizável de linhas quantidade + periodicidade | 2 |
| `app/actions/clients.ts` | `createClient` com serviços; `syncClientContractServices` | 2 |
| `components/agency/clients-view.tsx` | sheet Novo Cliente usando os campos | 2 |
| `components/agency/client-detail-view.tsx` | aba Contrato editável | 2 |
| `app/(agency)/clientes/page.tsx` | carrega `ContentType` ativos | 2 |
| `app/(agency)/clientes/[id]/page.tsx` | carrega tipos + `canEditContract` | 2 |
| `types/clients-ui.ts` | `contentTypeId` em `ClientContractService` | 2 |
| `lib/agency/labels.ts` | helpers `canDemandBriefing`, `canCompleteProduction`, `canRequestAdjustment`, `canRegisterPublication` | 3 |
| `components/board/card-detail-sheet.tsx` | gating de briefing/produção/publicação por status | 3 |
| `components/agency/demand-card.tsx` | esconder CTA de demandar fora do planejamento | 3 |
| `lib/services/cards.service.ts` | rejeitar `completeBriefingAndDemand` em status inválido | 3 |
| `app/actions/demand.ts` | mesma validação em `concluirBriefing` | 3 |

---

### Task 1: Commitar o fix de build do deploy

Sem isso, qualquer novo deploy a partir do `master` volta a falhar (rota `/notificacoes` duplicada) e o Prisma Client não é gerado na Vercel.

**Files:**
- Modify: `package.json` (script `postinstall`)
- Modify: `.gitignore`
- Create: `.vercelignore`
- Delete: `app/(app)/notificacoes/page.tsx`

**Interfaces:**
- Consumes: nada
- Produces: `master` com build verde; base para as tarefas 2 e 3

- [ ] **Step 1: Partir do master atualizado e criar a branch**

```bash
git checkout master
git pull --ff-only
git checkout -b fix/build-deploy-vercel
```

- [ ] **Step 2: Identificar o stash correto**

```bash
git stash list
```

Esperado: uma entrada com a mensagem `Cursor: moved local changes to cloud agent (source agent 2a59cb77-...)`. Anote o índice dela (provavelmente `stash@{0}`) e use esse índice nos passos seguintes.

- [ ] **Step 3: Aplicar o stash sem removê-lo**

```bash
git stash apply "stash@{0}"
git status -s
```

Esperado: modificações em `package.json`, `.gitignore`, `app/actions/clients.ts`, `components/agency/clients-view.tsx`, `components/agency/client-detail-view.tsx`, `app/(agency)/clientes/page.tsx`, `app/(agency)/clientes/[id]/page.tsx`, `types/clients-ui.ts` e remoção de `app/(app)/notificacoes/page.tsx`.

- [ ] **Step 4: Conferir o conteúdo do postinstall**

`package.json` deve conter, dentro de `scripts`:

```json
"postinstall": "prisma generate",
```

Se não estiver, adicione manualmente.

- [ ] **Step 5: Garantir o `.gitignore`**

O arquivo deve terminar com estas linhas (adicione as que faltarem, sem duplicar):

```gitignore
# superpowers / scratch
.superpowers/
_e.txt
```

- [ ] **Step 6: Criar o `.vercelignore`**

```
.env
.env.*
.superpowers
_e.txt
docs
```

- [ ] **Step 7: Confirmar que a rota duplicada saiu**

```bash
git status -s -- "app/(app)/notificacoes"
```

Esperado: `D app/(app)/notificacoes/page.tsx`. Se o diretório ainda existir no disco, remova:

```bash
git rm -r --cached "app/(app)/notificacoes" 2>$null
Remove-Item -Recurse -Force "app/(app)/notificacoes" -ErrorAction SilentlyContinue
```

- [ ] **Step 8: Rodar o build (esta é a verificação que importa aqui)**

```bash
npm run build
```

Esperado: build conclui sem `You cannot have two parallel pages that resolve to the same path`.

- [ ] **Step 9: Commitar somente os arquivos desta fatia**

```bash
git add package.json .gitignore .vercelignore
git add -u "app/(app)/notificacoes"
git commit -m "fix(build): gerar prisma client no postinstall e remover rota /notificacoes duplicada"
```

- [ ] **Step 10: Guardar o resto do trabalho antes de trocar de branch**

```bash
git stash push -u -m "escopo-contrato-wip"
git status -s
```

Esperado: working tree limpo.

- [ ] **Step 11: Abrir e mergear o PR**

```bash
git push -u origin HEAD
gh pr create --title "fix(build): corrigir build de producao" --body "Gera Prisma Client no postinstall da Vercel e remove a rota /notificacoes duplicada, que quebrava o build. Sem isso, deploys a partir do master falham.

Teste: npm run build local e deploy na Vercel."
```

Depois de mergeado:

```bash
git checkout master
git pull --ff-only
```

---

### Task 2: Escopo de contrato quantificado (Novo Cliente + edição na ficha)

Feature já implementada e com `tsc` limpo, mas nunca commitada. Spec: `docs/superpowers/specs/2026-07-28-escopo-contrato-quantificado-design.md`.

**Files:**
- Create: `lib/agency/contract-services.ts`
- Create: `components/agency/contract-scope-fields.tsx`
- Modify: `app/actions/clients.ts`
- Modify: `components/agency/clients-view.tsx`
- Modify: `components/agency/client-detail-view.tsx`
- Modify: `app/(agency)/clientes/page.tsx`
- Modify: `app/(agency)/clientes/[id]/page.tsx`
- Modify: `types/clients-ui.ts`

**Interfaces:**
- Consumes: `master` com o build corrigido (Task 1)
- Produces:
  - `CONTRACT_PERIODICITIES`, `periodicitySuffix(periodicity: string): string`, `demandTypeFromContentSlug(slug: string): DemandType`, `normalizeScopeLines(lines): ContractScopeLine[]`, tipo `ContentTypeOption = { id: string; name: string; slug: string }`
  - `buildScopeRows(contentTypes, existing?): ScopeFieldRow[]`, `scopeRowsToPayload(rows): { contentTypeId: string; quantity: number; periodicity: string }[]`, componente `ContractScopeFields`
  - server actions `createClient({ ..., services? })` e `syncClientContractServices(clientId, { planName?, contractNotes?, services })`

- [ ] **Step 1: Criar a branch a partir do master atualizado**

```bash
git checkout -b feat/escopo-contrato-quantificado-v2
```

- [ ] **Step 2: Restaurar o trabalho guardado**

```bash
git stash list
git stash pop "stash@{0}"
```

Confirme pela mensagem que é o `escopo-contrato-wip`. Se o índice for outro, use o índice correto.

- [ ] **Step 3: Conferir que os arquivos novos voltaram**

```bash
Test-Path lib/agency/contract-services.ts, components/agency/contract-scope-fields.tsx
```

Esperado: `True` para os dois. Se vier `False`, os arquivos não estavam no stash: recrie-os a partir da spec antes de seguir.

- [ ] **Step 4: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: exit 0, sem saída de erro.

- [ ] **Step 5: Smoke manual — criação**

```bash
npm run dev
```

1. Entrar como `gestao@samps.digital` / `Samps@2026`
2. `/clientes` → **Novo Cliente**
3. Preencher nome, marcar `Estático = 8` (Por mês) e `Stories = 12` (Por mês)
4. Salvar e abrir a ficha do cliente → aba **Contrato**

Esperado: os dois itens aparecem com `8 / mês` e `12 / mês`.

- [ ] **Step 6: Smoke manual — edição e remoção**

1. Na aba Contrato, clicar **Editar escopo**
2. Trocar `Stories` para `0` e `Estático` para `10`
3. Salvar

Esperado: `Stories` desaparece da lista, `Estático` mostra `10 / mês`.

- [ ] **Step 7: Smoke manual — criação sem escopo**

Criar outro cliente informando só o nome.

Esperado: cliente criado, aba Contrato mostra "Nenhum item de contrato cadastrado ainda." e botão **Cadastrar escopo**.

- [ ] **Step 8: Build**

```bash
npm run build
```

Esperado: sucesso.

- [ ] **Step 9: Commitar**

```bash
git add lib/agency/contract-services.ts components/agency/contract-scope-fields.tsx app/actions/clients.ts components/agency/clients-view.tsx components/agency/client-detail-view.tsx "app/(agency)/clientes/page.tsx" "app/(agency)/clientes/[id]/page.tsx" types/clients-ui.ts docs/superpowers/specs/2026-07-28-escopo-contrato-quantificado-design.md docs/superpowers/plans/2026-07-28-escopo-contrato-quantificado.md
git commit -m "feat(clientes): escopo de contrato quantificado por tipo e periodicidade"
```

- [ ] **Step 10: Gate de revisão**

Rodar o subagente **Bugbot** com `Diff: branch changes` sobre esta branch. Corrigir o que for procedente em commit adicional (`fix(clientes): ...`).

- [ ] **Step 11: PR**

```bash
git push -u origin HEAD
gh pr create --title "feat(clientes): escopo de contrato quantificado" --body "Substitui o textarea de escopo por linhas por tipo de conteudo (quantidade + periodicidade), gravando ContractService de verdade. Adiciona edicao do escopo na aba Contrato da ficha do cliente.

Regras: quantidade 0 ou vazia e ignorada; cliente pode ser criado sem itens; periodicidades monthly/weekly/competence/one_shot.

Teste: criar cliente com 8 estaticos e 12 stories, conferir aba Contrato, editar e zerar um item."
```

Mergear depois do gate.

---

### Task 3: Ações da demanda por status

Hoje demandas em disponível, produção, revisão e concluída ainda oferecem "Concluir briefing e demandar". Trabalho já feito, em `stash@{1}`.

**Files:**
- Modify: `lib/agency/labels.ts`
- Modify: `components/board/card-detail-sheet.tsx`
- Modify: `components/agency/demand-card.tsx`
- Modify: `lib/services/cards.service.ts`
- Modify: `app/actions/demand.ts`

**Interfaces:**
- Consumes: `BRIEFING_DEMAND_STATUSES: DemandStatus[]` e `demandStatusLabel(status: string): string` de `lib/agency/labels.ts`
- Produces:
  - `canDemandBriefing(status: string, briefingLockedAt?: Date | string | null): boolean`
  - `canCompleteProduction(status: string): boolean`
  - `canRequestAdjustment(status: string): boolean`
  - `canRegisterPublication(status: string): boolean`

- [ ] **Step 1: Branch a partir do master atualizado**

```bash
git checkout master
git pull --ff-only
git checkout -b fix/demand-actions-by-status
```

- [ ] **Step 2: Aplicar o stash da fatia**

```bash
git stash list
git stash apply "stash@{1}"
git status -s
```

Esperado: modificações nos cinco arquivos do File map desta tarefa. Se houver conflito com a Task 2 (ambas tocam `lib/agency/labels.ts` apenas se a Task 2 tiver alterado o arquivo — não deveria), resolva mantendo os helpers e `BRIEFING_DEMAND_STATUSES`.

- [ ] **Step 3: Conferir as regras de status em `lib/agency/labels.ts`**

O arquivo deve conter exatamente estas regras:

```ts
export const BRIEFING_DEMAND_STATUSES: DemandStatus[] = [
  DemandStatus.PENDING_PLANNING,
  DemandStatus.PLANNING,
  DemandStatus.OPEN,
  DemandStatus.BACKLOG,
];

export function canDemandBriefing(
  status: string,
  briefingLockedAt?: Date | string | null
) {
  if (briefingLockedAt) return false;
  return BRIEFING_DEMAND_STATUSES.includes(status as DemandStatus);
}

export function canCompleteProduction(status: string) {
  return (
    status === DemandStatus.IN_PRODUCTION ||
    status === DemandStatus.ADJUSTMENTS
  );
}

export function canRequestAdjustment(status: string) {
  return status === DemandStatus.IN_REVIEW;
}

export function canRegisterPublication(status: string) {
  return (
    status === DemandStatus.APPROVED ||
    status === DemandStatus.SCHEDULED ||
    status === DemandStatus.IN_REVIEW
  );
}
```

`DemandStatus` precisa ser importado como valor (`import { DemandStatus } from "@prisma/client"`), não com `import type`.

- [ ] **Step 4: Conferir a validação no backend**

`lib/services/cards.service.ts`, em `completeBriefingAndDemand`, antes de qualquer escrita:

```ts
if (!BRIEFING_DEMAND_STATUSES.includes(card.status)) {
  throw new Error(
    "Só é possível demandar cartões em planejamento. Status atual não permite esta ação."
  );
}
```

`app/actions/demand.ts`, em `concluirBriefing`:

```ts
if (!BRIEFING_DEMAND_STATUSES.includes(previous.status)) {
  return {
    error:
      "Só é possível demandar cartões em planejamento. Status atual não permite esta ação.",
  };
}
```

- [ ] **Step 5: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: exit 0. Se aparecer `TS2345 ... not assignable to parameter of type '"BACKLOG" | ...'`, é porque o array foi declarado inline em vez de usar `BRIEFING_DEMAND_STATUSES` tipado como `DemandStatus[]`.

- [ ] **Step 6: Smoke manual**

```bash
npm run dev
```

1. Login `social@samps.digital` / `Samps@2026`
2. Abrir um cartão em **A planejar / Em planejamento** → aba Briefing deve mostrar **Concluir briefing e demandar**
3. Abrir uma demanda **Em produção** → aba Briefing **não** mostra o botão; mostra o status atual
4. Abrir uma demanda **Em revisão** → aba Produção não oferece "Concluir produção"; aparece **Solicitar ajuste**
5. Abrir uma demanda **Concluída/Publicada** → nenhuma das três ações aparece

- [ ] **Step 7: Build**

```bash
npm run build
```

- [ ] **Step 8: Commitar**

```bash
git add lib/agency/labels.ts components/board/card-detail-sheet.tsx components/agency/demand-card.tsx lib/services/cards.service.ts app/actions/demand.ts
git commit -m "fix(demandas): liberar acoes do cartao conforme o status da demanda"
```

- [ ] **Step 9: Gate de revisão**

Subagente **Bugbot** com `Diff: branch changes`.

- [ ] **Step 10: PR e merge**

```bash
git push -u origin HEAD
gh pr create --title "fix(demandas): acoes por status" --body "Briefing so pode ser demandado em planejamento (PENDING_PLANNING, PLANNING, OPEN, BACKLOG) e sem briefingLockedAt. Producao aparece em IN_PRODUCTION/ADJUSTMENTS, ajuste em IN_REVIEW, publicacao em APPROVED/SCHEDULED/IN_REVIEW. Validacao tambem no servidor (cards.service e concluirBriefing).

Teste: abrir cartoes em planejamento, producao, revisao e concluida e conferir quais acoes aparecem."
```

---

### Task 4: Validar o que a reunião assumiu como pronto

Sem código. Serve para não prometer na reunião do dia 18 algo que está quebrado.

**Files:** nenhum (produz `docs/superpowers/notas/2026-08-validacao-fase0.md`)

**Interfaces:**
- Consumes: `master` com as tarefas 1–3 mergeadas
- Produces: nota com o resultado de cada validação

- [ ] **Step 1: Cronômetro de demanda**

Login `designer@samps.digital`. Assumir uma demanda disponível → iniciar cronômetro → pausar com motivo → retomar → concluir com link.

Esperado: status passa por `IN_PRODUCTION` e termina em `IN_REVIEW`; tempo acumulado aparece no cartão.

- [ ] **Step 2: Link do Drive obrigatório na conclusão**

Tentar concluir a produção com o campo de link vazio.

Esperado: botão desabilitado ou erro; a demanda não sai de produção.

- [ ] **Step 3: Campos obrigatórios no briefing**

Tentar demandar um cartão sem descrição.

Esperado: erro "Informe a descrição do briefing".

- [ ] **Step 4: Geração de cartões contratuais**

Criar uma competência nova para um cliente com contrato ativo.

Esperado: cartões contratuais gerados de acordo com as quantidades de `ContractService`.

- [ ] **Step 5: Portal do cliente**

Login `cliente@samps.digital`.

Esperado: só vê `/portal`; qualquer rota interna redireciona.

- [ ] **Step 6: Registrar o resultado**

Criar `docs/superpowers/notas/2026-08-validacao-fase0.md` com uma linha por item: `OK` ou `FALHA + descrição`. Cada `FALHA` vira tarefa no início da Fase 1.

```bash
git add docs/superpowers/notas/2026-08-validacao-fase0.md
git commit -m "docs: registrar validacao dos fluxos existentes (fase 0)"
```

---

### Task 5: Limpeza do repositório

**Files:**
- Delete: `_e.txt` (se existir no disco)
- Verify: `.superpowers/` ignorado

**Interfaces:**
- Consumes: tarefas 1–4 mergeadas
- Produces: working tree e stash list limpos

- [ ] **Step 1: Conferir que nada sensível está rastreado**

```bash
git ls-files | Select-String -Pattern "^\.env|_e\.txt|^\.superpowers"
```

Esperado: nenhuma saída.

- [ ] **Step 2: Remover scratch local**

```bash
Remove-Item -Force _e.txt -ErrorAction SilentlyContinue
```

- [ ] **Step 3: Descartar os stashes já aproveitados**

Só depois de confirmar que os PRs das tarefas 1–3 estão mergeados:

```bash
git stash list
git stash drop "stash@{0}"
git stash drop "stash@{0}"
git stash list
```

Esperado: lista vazia.

- [ ] **Step 4: Confirmar master verde**

```bash
git checkout master
git pull --ff-only
npx tsc --noEmit
npm run build
```

Esperado: ambos passam.

---

## Critério de saída da Fase 0

1. `git stash list` vazio
2. `master` com build e `tsc` limpos
3. Escopo de contrato e ações por status mergeados
4. `docs/superpowers/notas/2026-08-validacao-fase0.md` preenchido
5. Nenhum arquivo sensível rastreado
