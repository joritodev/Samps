# Fase 4 — Diferenciais e escala interna (escopo)

**Janela:** 08/09 → 19/09/2026
**Status deste documento:** escopo fechado, plano detalhado pendente.

> **Playbook (obrigatório):** `docs/superpowers/plans/2026-08-07-playbook-metodologia.md` — matriz seção 5 Fase 4.
>
> **Metodologia:** 4.1 (colunas livres no quadro do cliente — opção A) e 4.3 (Google Calendar sim/não) → `writing-plans` → SDD. 4.2 só com dados reais de `WorkSession`. 4.4 = DIR/SDD por item; upgrade Next 16 = plano próprio.
>
> Só entra depois de o operacional da Fase 3 estar em uso real. Cada fatia recebe plano detalhado no **Opus 5** antes da execução.
**Goal da fase:** o que a reunião pediu mas que exige o sistema já rodando para fazer sentido — personalização por cliente, previsibilidade de carga e agenda organizacional.

---

## Fatia 4.1 — Colunas personalizadas por cliente

**Pedido da reunião:** o modelo padrão de quatro colunas não serve para todo cliente (citado o método do Coco Bambu / quadros tipo Trello por campanha).

**Já existe:** `ClientBoard`, `BoardList`, wizard de criação de quadro, `/clientes/[id]/quadro/configuracoes`.

**Decisão (opção A):** coluna = organização visual livre no **quadro do cliente** apenas. Arrastar card entre colunas **não** muda `DemandStatus`. `/demandas` e setores ficam intactos. Sem mapa coluna→status. Templates de quadro ficam fora desta fatia.

**Escopo:**
- Criar, renomear, reordenar e arquivar colunas (`BoardList`, type `CUSTOM` + listas legadas)
- Permissão `boards.manage_lists` (admin / gestão / líder)
- UI na aba Listas e `+ Coluna` no kanban do cliente
- Migration sem perder cartão; `boardColumn` denormalizado estável por `listId`

**Aceite:** gestora cria colunas livres no quadro do cliente; colaborador move cards sem alterar status; gates do ciclo (Fase 3.0) continuam valendo.

**Risco:** confundir coluna do quadro com etapa do ciclo — mitigado mantendo status como fonte da verdade e isolando a feature do board de `/demandas`.

---

## Fatia 4.2 — Capacidade e limite de 8h por pessoa

**Status (25/09):** adiada. Não entra na fila atual.

**Pedido da reunião:** calcular tempo por tipo de entrega, limitar a carga diária a 8h e ganhar previsibilidade.

**Depende de:** dados reais de `WorkSession` acumulados nas Fases 2 e 3, e das médias por tipo da fatia 3.1. Sem histórico, o cálculo é chute.

**Escopo:**
- Estimativa por `ContentType`, alimentada pela média real com fallback configurável
- Carga prevista por pessoa por dia, comparada ao limite (padrão 8h, configurável)
- Aviso na atribuição quando a demanda estoura o dia do responsável
- Painel de capacidade por setor na semana

**Aceite:** ao atribuir a quinta demanda do dia para a mesma pessoa, o sistema avisa que a carga passou de 8h e mostra quem tem folga.

---

## Fatia 4.3 — Agenda organizacional

**Status em 2026-09-28:** aceite sem Google Calendar. Compromisso no `/agenda` com nome, horário, link, descrição, fim, local e tipo. Spec: `docs/superpowers/specs/2026-09-26-agenda-organizacional-design.md`.

**Pedido da reunião:** duas agendas — a macro (execução de projetos e resultados) e a organizacional (reuniões, podcasts, compromissos), possivelmente integrando ou substituindo o Google Agenda.

**Já existe:** `/agenda` com prazos, entregas, publicações e (Fase 2) aniversários e ausências.

**Escopo:**
- Model de evento próprio (não derivado de demanda): título, tipo, início, fim, participantes, local/link, cliente opcional
- Convite e confirmação de participantes
- Visões dia/semana/mês e alternância entre agenda macro e organizacional
- Integração com Google Calendar: **avaliar** antes de implementar (OAuth, escopo mínimo, quem autoriza). Se entrar, exportação `.ics` unidirecional primeiro; sincronização bidirecional é projeto próprio

**Aceite:** marcar uma reunião com três participantes, eles verem na agenda e receberem notificação.

---

## Fatia 4.4 — Dívidas técnicas acumuladas

**Status (28/09):** fechada. Cada item abaixo está feito ou repriorizado por escrito. Nada desta lista bloqueia a entrega operacional.

| Item | Decisão |
|------|---------|
| Agenda no mobile (células estreitas) | Feito em `9d74de4`: padding e badge menores na grade. |
| Portal com sidebar fixa | Já usa Sheet no mobile (`portal-sidebar.tsx`). A nota de agosto está velha. |
| Tabs densas do cartão | Só vira select se o time reclamar. Não entra agora. |
| CSP Report-Only | Feito na 3.7 (#59): modo enforce. |
| Next sem patch em 14.x | A CVE crítica já está em 14.2.35. Os `high` que sobram só saem no Next 16. Upgrade de major fica tarefa própria, com plano e smoke. Não entra nesta fatia. |
| Attachment com `clientId` nulo | Anda junto com anexos (3.2), adiada em 25/09. |
| Testes de `demands`, `board`, `priority` | Há teste de ciclo, lista e arraste. Suite nova de `priority.service` espera as regras da 3.5. Sem o documento da Samps, o teste gravaria a fórmula errada. |
| Deployment Protection e checks obrigatórios no GitHub | Humano, na conta Vercel/GitHub. O código não fecha isso. |

---

## Critério de saída da Fase 4

1. Quadro por cliente personalizável sem quebrar as regras de status
2. Capacidade de 8h: adiada em 25/09. Não bloqueia a saída da fase.
3. Agenda organizacional com eventos próprios e participantes
4. Dívida técnica da 4.4: fechada em 28/09 (feita ou repriorizada na tabela da fatia).
