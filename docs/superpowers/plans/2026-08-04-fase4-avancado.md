# Fase 4 — Diferenciais e escala interna (escopo)

**Janela:** 08/09 → 19/09/2026
**Status deste documento:** escopo fechado, plano detalhado pendente.

> **Playbook (obrigatório):** `docs/superpowers/plans/2026-08-07-playbook-metodologia.md` — matriz seção 5 Fase 4.
>
> **Metodologia:** 4.1 e 4.3 começam com `brainstorming` (mapa coluna↔status; Google Calendar sim/não) → `writing-plans` → SDD. 4.2 só com dados reais de `WorkSession`. 4.4 = DIR/SDD por item; upgrade Next 16 = plano próprio.
>
> Só entra depois de o operacional da Fase 3 estar em uso real. Cada fatia recebe plano detalhado no **Opus 5** antes da execução.
**Goal da fase:** o que a reunião pediu mas que exige o sistema já rodando para fazer sentido — personalização por cliente, previsibilidade de carga e agenda organizacional.

---

## Fatia 4.1 — Colunas personalizadas por cliente

**Pedido da reunião:** o modelo padrão de quatro colunas não serve para todo cliente (citado o método do Coco Bambu).

**Já existe:** `ClientBoard`, `BoardList`, wizard de criação de quadro, `/clientes/[id]/quadro/configuracoes`.

**Escopo:**
- Criar, renomear, reordenar e arquivar colunas por quadro de cliente
- Mapear cada coluna a um `DemandStatus` (a coluna é visual; o status é a regra) — isso é o ponto crítico: sem esse mapa, as validações da Fase 0 quebram
- Templates de quadro reutilizáveis
- Migração dos quadros existentes sem perder cartão

**Aceite:** criar um quadro com seis colunas para um cliente, mover cartões, e as regras de ação por status continuarem valendo.

**Risco alto:** coluna livre com status implícito destrói o ciclo de vida da demanda. O plano precisa deixar o status como fonte da verdade.

---

## Fatia 4.2 — Capacidade e limite de 8h por pessoa

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

Reservar espaço nesta fase para o que as anteriores empurraram:
- Itens cosméticos de mobile listados em `docs/superpowers/notas/2026-08-mobile.md`
- Achados de severidade média do Security Review
- Upgrade de major do Next, se a Fase 1 tiver deixado pendência sem patch em 14.x
- Cobertura de teste nos services mais críticos (`demands`, `board`, `priority`)

---

## Critério de saída da Fase 4

1. Quadro por cliente personalizável sem quebrar as regras de status
2. Aviso de capacidade funcionando com base em tempo real medido
3. Agenda organizacional com eventos próprios e participantes
4. Dívida técnica da lista acima zerada ou repriorizada por escrito
