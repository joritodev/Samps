# Spec — Visibilidade hierárquica + demanda avulsa + checklist multi-responsável

**Data:** 2026-09-15  
**Status:** Draft para validação iterativa com a Samps (áudio 15/09 + áudios de hierarquia 10/09)  
**Prazo demo:** sexta 19/09/2026 — entregar o máximo possível, ajustar com feedback  
**Origem:** conversas João ↔ dona da empresa (Trello como referência) + áudio sobre avulsa/checklist  
**Plano de execução:** `docs/superpowers/plans/2026-09-15-demandas-visibilidade-avulsa-checklist.md`

---

## 1. Problema

A Samps opera hoje no Trello com três camadas implícitas:

1. **Colaborador** — só vê e executa o próprio trabalho.
2. **Líder de setor** — vê e coordena o setor inteiro.
3. **Gestão / Admin** — vê toda a operação.

No Samps OS essas camadas existem pela metade: há Meu Painel, quadros de setor e `/demandas`, mas o filtro de visibilidade vaza (cliente alocado, leitura cruzada entre setores na demo 3.4) e não há fluxo claro de **demanda avulsa** nem de **checklist com responsáveis diferentes** que caiam no individual de cada pessoa.

Além do cronograma contratual fixo (`ContractService`), a operação cria trabalho fora do pacote e decompõe demandas (obrigatórias ou avulsas) em checkpoints executados por pessoas distintas.

## 2. Objetivo

Até sexta, o time consegue demonstrar e usar:

1. **Visão hierárquica no quadro de demandas** (analogia Trello individual / time / agência).
2. **Criar demanda avulsa no quadro do cliente**, com destino imediato no individual do responsável.
3. **Checklist em qualquer demanda**, em que cada checkpoint com responsável aparece no individual dessa pessoa.

Feedback da Samps durante a semana manda no ajuste fino; defaults abaixo são travas para não travar implementação.

## 3. Decisões travadas (defaults para iterar)

| Tema | Escolha | Por quê |
|------|---------|---------|
| Analogia Trello | Filtro de visibilidade, não board físico por pessoa | Reaproveita Meu Painel / setores / `/demandas` |
| Colaborador em `/demandas` | Só demandas em que é `assigneeId` **ou** `requesterId` | “Cada um vê as próprias” |
| Líder | Vê todas do **seu** `sectorId` (onde é `leaderId`) | “Matias / Dani / Leo coordenam o setor” |
| Gestão / Admin | Vê todas (`clients.view_all` + userType ADMIN/MANAGEMENT) | “Gestão vê todos os trelos” |
| Leitura cruzada entre setores (demo 3.4) | **Remover** para colaborador comum | Contraria o áudio da dona |
| Demanda avulsa | `DemandType.EXTRA` + `DemandOrigin.EXTRA` (ou CLIENT_BOARD com type EXTRA) | Já existe no schema/permissão |
| Criar avulsa | CTA no quadro do cliente; exige `demands.extra_create` ou `demands.create` | Social/Gestão |
| Destino da avulsa | Obrigatório escolher **responsável** na criação → já nasce no individual | Áudio: “automaticamente vai pro individual” |
| Checklist | Filhos da demanda (`parentDemandId`) = checkpoints | Reusa fila, timer, status, individual |
| Quem pode montar checklist | Quem tem `demands.edit` (Social/Gestão/Admin; overrides ok) | “Social pode criar checklist a depender da demanda” |
| Checkpoint sem responsável | Fica só na lista do pai (não some no individual de ninguém) | Evita fantasma na fila |
| Checkpoint com responsável | Cria/atualiza demanda filha `assigneeId` = responsável + assignment do setor | Cai no Meu Painel |
| Projeto legado `ProjectChecklistItem` | Não migrar nesta semana | Fora do caminho crítico; checklist de demanda cobre LP/lançamento via demanda pai |
| Templates de checklist | Fora do MVP de sexta | Depois do vídeo / feedback |
| Auto-geração do cronograma contratual | Fora desta onda | `ContractService` já cadastra quantidades; geração de cards = fatia futura |

### Abordagens consideradas (checklist)

| Opção | Prós | Contras | Veredito |
|-------|------|---------|----------|
| A — Só `DemandChecklistItem` (título/done/assignee) | Schema leve | Não cai no individual sem query extra; sem timer/ciclo | Não |
| B — Só demandas filhas (`parentDemandId`) | Reusa tudo; individual “de graça” | Checklist = lista de cards | **Sim (MVP)** |
| C — Item + link opcional para filha | Flexível | Dois modelos, mais UI | Depois, se B doer |

## 4. Modelo de visibilidade

```
                    ┌─────────────────────────┐
                    │ Gestão / Admin          │
                    │ /demandas = tudo        │
                    │ /setores/* = tudo       │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
        Líder Design      Líder Social       Líder Vídeo
        setor design      setor social       setor video
              │                 │                 │
              ▼                 ▼                 ▼
        Colaboradores     Colaboradores     Colaboradores
        só o próprio      só o próprio      só o próprio
        Meu Painel        Meu Painel        Meu Painel
```

### Regras por superfície

| Superfície | Colaborador | Líder do setor | Gestão/Admin |
|------------|-------------|----------------|--------------|
| `/meu-painel/*` | Pool AVAILABLE do **próprio** setor + minhas | Fila completa do setor (`leaderFullView`) | N/A (usam `/demandas` / `/setores`) |
| `/setores/[slug]` | **Bloqueado** ou redirect ao Meu Painel (fim da demo 3.4) | Leitura/escrita no próprio setor; outros setores só se gestão | Todos os setores |
| `/demandas` | Só `assigneeId = eu` **ou** `requesterId = eu` | Demandas do setor que lidera **∪** minhas/requester | Todas |
| Quadro do cliente | Continua escopo de cliente (`clients.view_*`); escrita conforme permissão | Idem | Idem |

### Função canônica (novo helper)

`buildDemandVisibilityWhere(user): Prisma.DemandWhereInput`

- ADMIN / MANAGEMENT / `clients.view_all` + userType gestão → `{}` (respeitando só canceladas se a tela filtrar).
- Senão, se `user.id === sector.leaderId` para algum setor → `OR: [sectorId in ledSectors, assigneeId, requesterId]`.
- Senão → `OR: [{ assigneeId: user.id }, { requesterId: user.id }]`.
- Sempre intersectar com `canAccessClient` / RLS existente (cliente externo inalterado).

**Aceite de visibilidade**

1. Designer Bia não vê demanda atribuída ao Leandro.
2. Matias (líder design) vê todas do setor design.
3. Gestão vê Bia + Leandro + outros setores.
4. Colaborador não abre `/setores/video` em leitura “só para olhar”.

## 5. Demanda avulsa

### Fluxo

```
Quadro do cliente
  → “Nova demanda avulsa”
  → título, tipo/formato, setor, responsável (obrigatório), prazo opcional
  → createDemand(type=EXTRA, origin=EXTRA|CLIENT_BOARD, assigneeId=…)
  → DemandAssignment ASSIGNED (method MANAGEMENT|SOCIAL)
  → aparece no Meu Painel do responsável
```

### Regras

- Permissão: `demands.extra_create` **ou** `demands.create`.
- Acesso ao cliente obrigatório.
- Sem responsável → erro de validação (diferente da demanda contratual que pode ir à fila AVAILABLE).
- Status inicial: `DEMANDED` (já direcionada) ou `AVAILABLE`→`ASSIGNED` na mesma action; preferir **já ASSIGNED** com `assigneeId`.
- Continua podendo receber checklist depois (seção 6).

### UI

- Botão no `BoardHeader` / sheet do quadro do cliente (não só em `/demandas`).
- Label: **“Demanda avulsa”** (não misturar com “Nova demanda” genérica se a tela já tiver criação contratual/planejada).
- Badge visual `EXTRA` / “Avulsa” no card.

**Aceite avulsa**

1. Social cria avulsa “criativo vagas” no cliente X, escolhe designer Y.
2. Y vê no Meu Painel imediatamente; Z do mesmo setor não vê (exceto líder).
3. Sem permissão `extra_create`/`create` → CTA oculto e action rejeita.

## 6. Checklist multi-responsável

### Conceito

Uma **demanda pai** (obrigatória ou avulsa) pode ter **N demandas filhas** (= checkpoints).

Exemplo — vídeo obrigatório “corte de podcast”:

| Checkpoint | Responsável |
|------------|-------------|
| Baixar material | Pessoa A |
| Selecionar melhores momentos | Pessoa B |
| Executar cortes | Pessoa C |

Cada linha com responsável vira cartão no individual daquela pessoa. O pai permanece o “container” (briefing, prazo de publicação, cliente).

### Schema (migration nesta onda — Fatia C)

```prisma
model Demand {
  // ... campos existentes
  parentDemandId String?
  checklistOrder Int?
  isChecklistItem Boolean @default(false)

  parent   Demand?  @relation("DemandChecklist", fields: [parentDemandId], references: [id])
  children Demand[] @relation("DemandChecklist")
}
```

Índice: `@@index([parentDemandId])`.

### Regras de serviço

- `addChecklistItem(parentId, { title, assigneeId?, sectorId? })`
  - Cria filha com `isChecklistItem=true`, `parentDemandId`, `clientId` herdado, `type` herdado ou `OTHER`.
  - Se `assigneeId`: assignment ASSIGNED + notificação “Checkpoint atribuído”.
  - Se sem assignee: filha existe só como item pendente de alocação (visível no sheet do pai; não polui Meu Painel alheio).
- `assignChecklistItem(childId, assigneeId)` — preenche responsável e empurra ao individual.
- `completeChecklistItem` — conclui a filha (`DONE`); recalcula progresso do pai (`children done / total`).
- Pai **não** auto-conclui só porque filhos fecharam (Gestão/Social decide no fluxo normal); UI mostra progresso `3/5`.
- Apagar item: só se filha não estiver `IN_PRODUCTION`+ com sessão ativa; senão bloquear.

### UI

- Aba/seção **Checklist** no sheet da demanda (pai).
- Lista ordenável (sort por `checklistOrder`).
- Linha: título, responsável (select), status, link “abrir”.
- CTA “Adicionar item”.
- No Meu Painel, filha aparece como demanda normal com chip “Parte de: {título pai}”.

**Aceite checklist**

1. Social adiciona 3 checkpoints com 3 responsáveis numa demanda obrigatória.
2. Cada um vê só o próprio checkpoint no individual.
3. Líder do setor vê os três no quadro do setor.
4. Progresso no pai reflete conclusões.

## 7. Permissões (sem inventar código novo além do necessário)

| Ação | Permissão / regra |
|------|-------------------|
| Criar demanda planejada | `demands.create` |
| Criar avulsa | `demands.extra_create` ∨ `demands.create` |
| Editar / montar checklist | `demands.edit` |
| Atribuir responsável (pai ou checkpoint) | `demands.assign` ∨ líder do setor |
| Assumir da fila | autenticado + setor (claim atual) |
| Ver | helper de visibilidade (seção 4) |

Seed: Social já tem `create` + `extra_create`; Gestão/Admin ALL. Líderes dependem de `leaderId` para assign mesmo sem `demands.assign` no papel Social.

## 8. Fora de escopo (até sexta / explicitamente depois)

- Templates de checklist (“LP”, “lançamento”) configuráveis.
- Geração automática de cards a partir de `ContractService` (cronograma fixo → cartões).
- Migrar `Project` / `ProjectChecklistItem` para o novo modelo.
- Chat / WhatsApp.
- Mudança de RLS Postgres (continuar client-scope; visibilidade interna é filtro de app).
- Fatia 3.2 anexos (continua na fila do roadmap; não bloqueia esta onda).

## 9. Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Feedback do vídeo muda o modelo de checklist | Fatia C por último; A+B já demonstráveis |
| Schema de filhas polui `/demandas` da gestão | Filtro default: pais + avulsas; toggle “incluir checkpoints” |
| Colaborador perde visão útil da demo 3.4 | Comunicar: líder/gestão cobrem coordenação |
| Avulsa sem setor | Exigir `sectorId` + `assigneeId` na action |
| Escopo estoura sexta | Ordem fixa A → B → C; C pode ir MVP (add/assign/complete sem reorder drag) |

## 10. Ordem de entrega (até sexta 19/09)

| # | Fatia | Demo para a Samps | Dia alvo |
|---|-------|-------------------|----------|
| A | Visibilidade hierárquica | “Bia só vê as dela; Matias o setor; gestão tudo” | qua 17 |
| B | Demanda avulsa no quadro do cliente | “Criei avulsa e caiu no individual do designer” | qui 18 |
| C | Checklist multi-responsável (MVP) | “3 checkpoints → 3 individuais” | sex 19 |

Plano detalhado: `docs/superpowers/plans/2026-09-15-demandas-visibilidade-avulsa-checklist.md`.

## 11. Perguntas em aberto (defaults se o vídeo não vier)

1. Checkpoint é subtarefa leve ou demanda filha completa? → **filha completa (B)**.
2. Pai continua no individual de alguém? → **só se tiver `assigneeId` próprio; senão só no quadro do cliente / solicitante**.
3. Avulsa sem checklist ainda passa por briefing? → **não obrigatório no MVP; status DEMANDED/ASSIGNED direto**.
4. Social líder vs Social executor? → **mesmo role; líder = `sector.leaderId`; visibilidade/assign via líder**.

Quando o vídeo chegar: atualizar esta spec com diff curto em `docs/superpowers/notas/`, sem reescrever o plano inteiro se A/B já estiverem mergeados.
