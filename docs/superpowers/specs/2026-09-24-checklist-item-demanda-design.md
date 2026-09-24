# Spec — Checklist com detalhes e item que nasce demanda

**Data:** 2026-09-24  
**Status:** Aprovada na sessão (modelo + tela)  
**Origem:** pedido do cliente (Natan, 24/09) — checklist abre com campos de demanda; cada item é uma sub-etapa  
**Substitui:** decisões de ciclo de vida do item em `2026-09-21-checklist-trello-paridade-design.md` (item leve até atribuir). Mantém N checklists nomeados, barra de progresso, responsável e prazo na linha.

---

## 1. Problema

A demanda pai precisa ser quebrada em sub-etapas. Cada checklist (planejamento, estudo, validação, etc.) carrega descrição, prioridade e comentários, preenchidos ou em branco. Cada item adicionado já é uma demanda filha. Com responsável, essa filha aparece no Meu Painel. O quadro do cliente continua mostrando só o pai. Isso pode mudar depois, sem redesenhar o dado.

## 2. Decisões fechadas

| Tema | Escolha |
|------|---------|
| Onde a checklist vive | Bloco da demanda pai. Não vira cartão no quadro nem no Meu Painel |
| Campos da checklist | `description` e `priorityId` opcionais. Comentários em `Comment` |
| Item ao criar | Sempre cria `Demand` filha na mesma transação |
| Item sem responsável | Filha existe. Fica só dentro da checklist. Fora do Meu Painel |
| Item com responsável | Filha entra no Meu Painel de quem foi atribuído |
| Quadro do cliente e `/demandas` | Continuam filtrando `isChecklistItem: false` |
| Tag | Meu Painel: `Parte de: {pai} · {checklist}`. Detalhe da filha mantém `Parte de: {pai}` |
| N checklists | Sim, no mesmo pai |
| Auto-concluir pai | Não |
| Checklist dentro da filha | Fora |
| Filha no quadro do cliente | Fora. O interruptor futuro é o filtro `isChecklistItem` |
| Prioridade da checklist | Não copia para os itens |

## 3. Modelo de dados

`Checklist` ganha:

```prisma
description String?
priorityId  String?
priority    PriorityLevel? @relation("ChecklistPriority", fields: [priorityId], references: [id], onDelete: SetNull)
```

Em `PriorityLevel`, o lado inverso é `checklists Checklist[]` com `@relation("ChecklistPriority")`, para não colidir com `demands`.

Comentário da checklist:

- `Comment.entityType = "Checklist"`
- `Comment.entityId = checklist.id`
- `Comment.demandId` = id da demanda pai (RLS de `Comment` exige `demandId`)
- `visibility` padrão `INTERNAL`
- A aba Comunicação do pai não lista `entityType = "Checklist"`

`ChecklistItem` não ganha descrição nem prioridade. Esses campos da sub-etapa ficam na `Demand` filha (`description`, `priorityId`, `comments`).

A filha continua `isChecklistItem = true`, `parentDemandId` = demanda do quadro, `ChecklistItem.linkedDemandId` único.

Título, prazo e responsável seguem sincronizados entre a linha e a filha, como hoje. Prioridade e descrição só na filha.

## 4. Regras de comportamento

1. **Criar item** — título obrigatório (Enter). Na mesma transação: `ChecklistItem` + `Demand` filha com descrição vazia, sem responsável, `status = OPEN`. Sem transação pela metade: se a filha falha, o item não fica.
2. **Sem responsável** — filha não entra no Meu Painel.
3. **Atribuir** — reusa a filha já ligada. Mesmas regras atuais de responsável com setor, status e notificação. Não exige descrição.
4. **Remover responsável** — filha perde assignee e sai do Meu Painel. A filha não é apagada.
5. **Editar título ou prazo na linha** — atualiza item e filha.
6. **Editar descrição, prioridade ou comentário do item** — só na filha, pelo cartão dela.
7. **Toggle `isDone`** — igual hoje: marca o item e sincroniza conclusão/reabertura da filha.
8. **Apagar item** — apaga a filha se não houver sessão de produção ativa. Se houver, bloqueia com o erro atual e não apaga o item.
9. **Apagar checklist** — mesma regra de apagar, para cada filha ligada, depois apaga a lista.
10. **Detalhes da checklist** — salvar descrição vazia e prioridade vazia é válido. Comentário vazio não grava.
11. **Progresso** — continua `isDone` na linha (`done/total` e `%`). Não muda com prioridade nem com status da filha fora do toggle.

## 5. UI

Aba Checklist no cartão pai:

- Vários blocos, um por checklist, como hoje: título, `n/m`, barra, itens, “Adicionar checklist”.
- Sob o título, bloco **Detalhes**. Começa aberto. O usuário minimiza se quiser. O abrir/fechar vale só na sessão.
- Aberto: textarea de descrição, select de prioridade (opção vazia), lista de comentários, campo para comentar.
- Linha do item: checkbox, título, responsável, prazo, menu. Checkbox não abre o cartão. Clique no título abre a filha.
- Reordenação que já existe permanece.

Cartão da filha:

- Descrição opcional. O briefing não bloqueia filha sem descrição.
- Select de prioridade no mesmo bloco da descrição.
- Comentários na aba que já existe.
- Tag `Parte de: {pai}` e voltar ao pai permanecem.
- Aba Checklist da filha continua escondida.

Meu Painel (as quatro rotas usam `SectorBoardView` → `components/shared/demand-card.tsx`):

- A tag que já existe, `Parte de: {pai}`, passa a `Parte de: {pai} · {checklist}`.
- `getSectorBoardData` inclui o título da checklist pela filha (`linkedChecklistItem.checklist.title`).

## 6. Permissões

| Ação | Quem |
|------|------|
| Criar/renomear/apagar checklist; editar descrição e prioridade da checklist; add/editar/apagar item; atribuir; prazo | `demands.edit` |
| Comentar na checklist | Mesma porta de `addCommentAction`: usuário autenticado que já alcança o cartão pai |
| Comentar na filha | `addCommentAction` da filha, sem mudança |
| Toggle | Igual hoje |

## 7. Fora de escopo

- Checklist aninhada na demanda filha
- Mostrar a filha como cartão no quadro do cliente ou em `/demandas`
- Arrastar entre checklists
- Templates
- Auto-conclusão do pai em 100%
- Copiar prioridade da checklist para os itens

## 8. Aceite

1. Pai com duas checklists nomeadas (ex.: Planejamento e Estudo).
2. Detalhes vazios salvam e o bloco começa aberto. Minimizar esconde os campos na sessão.
3. Comentário na checklist grava com `entityType = "Checklist"` e `demandId` do pai, aparece ao reabrir e não entra na aba Comunicação do pai.
4. Item novo cria demanda filha na hora. Sem responsável, ela não está no Meu Painel.
5. Atribuir responsável coloca a mesma filha no Meu Painel, com a tag `Parte de: {pai} · {checklist}`.
6. Abrir a filha permite descrição vazia e prioridade escolhida. Aba Checklist não aparece.
7. Apagar item sem sessão de produção apaga a filha. Com sessão ativa, não apaga.
8. Quadro do cliente não lista a filha.
