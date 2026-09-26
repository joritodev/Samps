# Spec — Agenda organizacional (fatia 4.3)

**Data:** 2026-09-26  
**Status:** proposta de brainstorming. **Não aprovada.** Sem plano de implementação e sem código até a Samps confirmar a decisão abaixo.  
**Pedido:** duas agendas — a macro (prazos e entregas) e a organizacional (reuniões, podcasts, compromissos). A reunião deixou em aberto se isso substitui o Google Agenda.

---

## Decisão proposta

**Não integrar o Google Calendar na fatia 4.3.**

A agenda organizacional nasce dentro do Samps OS. Quem quiser o compromisso no Google copia o horário na mão, ou uma fatia futura exporta um arquivo `.ics` sem OAuth. Sincronização bidirecional fica fora desta fase.

## Por que não o Google agora

| Caminho | O que entrega | O que custa |
|---------|---------------|-------------|
| **Nativo, sem Google (recomendado)** | Reunião com participantes, visões dia/semana/mês, notificação já existente | Modelo novo de evento. Não mexe em auth. |
| Exportar `.ics` | O evento cai no Google de quem importar o arquivo | Sem login Google. Não atualiza o evento se alguém mudar o horário lá. |
| OAuth + sync | A agenda da Samps e o Google ficam espelhados | Conta que autoriza (uma da agência ou cada pessoa), escopos, token, conflito quando os dois lados editam, review de auth. A fase 4 já trata sync bidirecional como projeto próprio. |

O `/agenda` de hoje não é uma agenda de compromissos. `AgendaEvent` em `lib/agency/agenda-events.ts` só projeta prazo, entrega, publicação, aniversário e ausência. Reunião não cabe nesse tipo sem um registro próprio.

Aceite da fase: três pessoas veem a reunião e recebem notificação. Isso fecha com o modelo de `Notification` que já existe. OAuth não entra nesse aceite.

## O que a fatia passa a ser, se a proposta for aceita

- Evento próprio, separado da demanda: título, tipo (reunião, podcast, compromisso), início, fim, local ou link, cliente opcional, participantes internos.
- Quem cria convida; o convidado vê o evento na agenda organizacional e recebe notificação.
- A agenda macro continua sendo a de hoje (prazos, entregas, publicações, aniversários, ausências).
- Troca de visão entre macro e organizacional.
- Sem Google, sem `.ics`, sem coluna nova em `Demand`.

## O que esta spec não fecha

- Lista oficial de tipos de compromisso além de reunião, podcast e compromisso genérico.
- Se cliente externo vê a reunião. Proposta: não. Participante é usuário interno.
- Se ausência ou aniversário mudam de lugar. Proposta: permanecem na agenda macro.

## Próximo passo

Aceite ou recusa desta proposta pela Samps. Só então `writing-plans` da fatia 4.3. Se a resposta for “precisa do Google”, o plano começa pelo desenho de OAuth (quem autoriza e escopo mínimo), não pela tela.
