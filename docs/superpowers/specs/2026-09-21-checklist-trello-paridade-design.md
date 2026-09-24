# Spec — Checklist tipo Trello (itens leves + N listas)

**Data:** 2026-09-21  
**Status:** Substituída em 2026-09-24 no ciclo de vida do item. N listas, barra, responsável e prazo continuam. Ver `2026-09-24-checklist-item-demanda-design.md`.  
**Origem:** rejeição do checklist atual (form pesado ≠ Trello) + brainstorming sessão 21/09  
**Substitui / estende:** seção 6 de `2026-09-15-demandas-visibilidade-avulsa-checklist-design.md` (modelo de UI e ciclo de vida do item; filhos `Demand` continuam só quando há responsável)

---

## 1. Problema

O checklist entregue na Fatia C exige título, descrição, formato, prazo e botão “Demandar ao setor” / “Concluir”. Isso não é o checklist do Trello: lá o fluxo é checkbox + texto, Enter para adicionar, N checklists nomeados por card, progresso %, e membro/prazo no hover.

A Samps ainda precisa que **atribuir responsável** jogue trabalho no Meu Painel — isso não existe no Trello puro. A ponte é: item leve por padrão; ao atribuir, cria demanda-filha ligada.

## 2. Decisões fechadas

| Tema | Escolha |
|------|---------|
| UX alvo | Idêntica ao Trello na aba Checklist (densidade, add, toggle, N listas) |
| Item sem responsável | Leve: só `ChecklistItem`, sem `Demand` |
| Item com responsável | Cria/atualiza `Demand` filha (`isChecklistItem`) + `linkedDemandId` → Meu Painel |
| N checklists | Sim — vários nomeados por demanda pai |
| Modelo de dados | Tabelas novas `Checklist` + `ChecklistItem` (abordagem 1) |
| Auto-concluir pai | Não |
| Drag reorder | Fora do MVP (ordem = criação / `sortOrder` estável) |
| Converter item em card do quadro | Fora (assign cobre Meu Painel) |
| Templates | Fora |

## 3. Modelo de dados

Nomes de modelo evitam colisão com a relation Prisma já existente `"DemandChecklist"` (pai/filho em `Demand`).

```prisma
model Checklist {
  id        String   @id @default(cuid())
  demandId  String
  title     String
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  demand Demand          @relation(fields: [demandId], references: [id], onDelete: Cascade)
  items  ChecklistItem[]

  @@index([demandId])
}

model ChecklistItem {
  id              String    @id @default(cuid())
  checklistId     String
  title           String
  isDone          Boolean   @default(false)
  sortOrder       Int       @default(0)
  assigneeId      String?
  dueDate         DateTime?
  linkedDemandId  String?   @unique
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  checklist     Checklist @relation(fields: [checklistId], references: [id], onDelete: Cascade)
  assignee      User?     @relation(fields: [assigneeId], references: [id], onDelete: SetNull)
  linkedDemand  Demand?   @relation(fields: [linkedDemandId], references: [id], onDelete: SetNull)

  @@index([checklistId])
  @@index([assigneeId])
}
```

Campos atuais em `Demand` (`parentDemandId`, `isChecklistItem`, `checklistOrder`) **permanecem** para a demanda-filha ligada.

## 4. Regras de comportamento

1. **Adicionar item** — só `title` (Enter). Sem descrição/formato obrigatórios.
2. **Toggle `isDone`** — atualiza o item. Se existe `linkedDemandId`: done → conclui a filha (mesmas regras de `completeChecklistItem` hoje); undoes → reabre para status operacional simples (`ASSIGNED` se tinha assignee, senão `AVAILABLE`/`DEMANDED` conforme estado prévio mínimo documentado no plano).
3. **Atribuir membro** — se sem link: cria filha (`isChecklistItem=true`, `parentDemandId` = demanda do checklist, herda `clientId`), seta `linkedDemandId`, assignment → Meu Painel + notificação. Se já tem link: reassign da filha.
4. **Remover membro** — limpa `assigneeId` do item; filha fica sem assignee (some do individual); **não** apaga a filha.
5. **Apagar item** — apaga `ChecklistItem`. Se filha ligada sem sessão de produção ativa: apaga filha. Senão: bloqueia com erro claro.
6. **Apagar checklist** — apaga lista e items (cascata); mesmas regras de apagar item para cada filha ligada.
7. **Progresso** — por checklist: `done/total` e `%` (`isDone`).
8. **Chip** — filha no Meu Painel / card mantém “Parte de: {título pai}”.

## 5. UI

Aba **Checklist** no sheet da demanda pai:

- Lista de `Checklist` ordenada por `sortOrder`.
- Por checklist: título editável; menu `…` (apagar checklist; ocultar concluídos); barra + `n/m` + `%`; items; input “Adicionar um item”.
- Item: checkbox | título (inline) | avatar | prazo | `…` (atribuir, prazo, apagar, “Abrir demanda” se linked).
- CTA final: “Adicionar checklist”.
- Remover form pesado atual e CTAs “Demandar ao setor” / “Concluir” separados.
- Visual: tokens Samps (`bg-card`, `border-border`, primary no check); sem wash âmbar/fuchsia.

## 6. Permissões

| Ação | Quem |
|------|------|
| Criar/renomear/apagar checklist; add/edit/apagar item; atribuir; prazo | `demands.edit` |
| Toggle item sem link | `demands.edit` no pai |
| Toggle item com link | mesmas regras de concluir a demanda-filha |

## 7. Migração de dados

Para cada pai que tem filhos `isChecklistItem=true`:

1. Criar um `Checklist` título `"Checklist"`, `sortOrder=0`.
2. Para cada filho (ordem `checklistOrder` / `createdAt`): criar `ChecklistItem` com `title`, `assigneeId`, `dueDate`, `linkedDemandId=filho.id`, `isDone` se status ∈ {DONE, PUBLISHED, DELIVERED}.
3. Não apagar filhos nesta migration.

## 8. Fora de escopo

- Drag-and-drop de items/listas  
- Templates de checklist  
- “Converter em card” no quadro do cliente  
- `ProjectChecklistItem` legado  
- Auto-conclusão do pai em 100%

## 9. Aceite

1. Pai com 2 checklists nomeados; add item com Enter.  
2. Item sem membro: checkbox only; nenhuma `Demand` filha nova.  
3. Atribuir membro → filha no Meu Painel + chip “Parte de”.  
4. Check no item com link sincroniza conclusão da filha; uncheck reabre.  
5. Filhos checklist pré-existentes aparecem no novo UI após migration.  
6. Form antigo (descrição/formato obrigatórios) não aparece mais.

## 10. Relação com a spec de 15/09

Mantém: filhos como veículo do Meu Painel, chip, permissão `demands.edit`, pai não auto-conclui.  
Muda: UI e ciclo de vida (leve → assign → link); N `Checklist` nomeados; CRUD via `Checklist`/`ChecklistItem` em vez de criar filha no “Adicionar”.
