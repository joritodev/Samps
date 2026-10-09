# Spec — Agenda organizacional (fatia 4.3)

**Data:** 2026-09-26  
**Aceite:** 2026-09-28. Sem Google Calendar. A reunião precisa de nome, horário, link, descrição e o que acompanha um compromisso (fim, local, tipo). Sem convite de participantes e sem sincronizar outra agenda.

**Atualização 2026-09-28:** a fatia 4.3 continua sem Google. O vínculo com a conta da agência e o pop-up de abertura estão em `docs/superpowers/specs/2026-09-28-google-agenda-abertura-design.md`.

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

## O que esta fatia entrega

- Compromisso próprio, separado da demanda, visível no `/agenda` junto dos prazos.
- Campos: nome, início, fim, link da reunião, descrição, local, tipo (reunião, podcast ou compromisso).
- Quem é da equipe cria, edita e apaga. Cliente externo não vê.
- A agenda de prazos, entregas, publicações, aniversários e ausências continua como está.
- Sem Google, sem `.ics`, sem convite e sem coluna nova em `Demand`.

## O que esta spec não fecha

- Lista oficial de tipos de compromisso além de reunião, podcast e compromisso genérico.
- Se cliente externo vê a reunião. Proposta: não. Participante é usuário interno.
- Se ausência ou aniversário mudam de lugar. Proposta: permanecem na agenda macro.

## Próximo passo

Implementar nesta fatia. Google Calendar continua fora.
