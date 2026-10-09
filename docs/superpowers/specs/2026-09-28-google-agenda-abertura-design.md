# Spec — Google Agenda e abertura do sistema

**Data:** 2026-09-28  
**Status:** Aprovado na sessão (abordagem 1 + abertura + bloco técnico)  
**Substitui:** a frase “Google Calendar continua fora” da spec `2026-09-26-agenda-organizacional-design.md`, só para esta fatia. A fatia 4.3 permanece entregue, nativa, sem OAuth.

## 1. Problema

A cliente pediu o Google Agenda ligado à agenda do Samps, nos dois lados, com uma conta da agência sempre conectada. Também repetiu o pedido das primeiras reuniões: ao ligar o sistema, ver os aniversariantes do mês, um pop-up se houver aviso da semana, e a agenda com as tarefas do dia.

Hoje o aniversário do dia fica no megafone. O pop-up de aviso só aparece quando um comunicado passa a valer com a sessão já aberta. Não há conta Google, cron nem token.

## 2. Objetivo

1. Pop-up de abertura, uma vez por dia, na área interna: aniversariantes do mês, avisos da semana, agenda de hoje.
2. Uma conta Google da agência, autorizada uma vez por admin ou gestão. O servidor renova o acesso. Ninguém fica logado no Google no navegador.
3. Reunião sincroniza nos dois lados. Aniversário, prazo, entrega, publicação e ausência só saem do Samps para o Google.
4. Evento criado no Google entra na agenda do Samps como compromisso.
5. Sem a conta conectada, ou com o Google fora, o pop-up e a agenda continuam com os dados do Samps.

## 3. Decisões travadas

| Tema | Escolha |
|------|---------|
| Sentido | Os dois lados para reunião e para evento nascido no Google. Projeções do Samps só vão para o Google |
| Conta | Uma conta da agência. Calendário `primary` dessa conta |
| Quem conecta e desconecta | `ADMIN` e `MANAGEMENT`, em Configurações |
| Quem sincroniza na hora | Qualquer usuário interno em `/agenda`. Cliente externo não |
| Conflito de reunião | Quem alterou por último ganha. Empate: Samps |
| Conflito de projeção | Samps ganha. Edição ou exclusão no Google é desfeita no próximo sync |
| Evento novo no Google | Vira `AgendaMeeting` com `kind` `OTHER` |
| Pop-up | Uma vez por dia civil, por navegador, na área interna. Portal do cliente não mostra |
| Dia, semana e mês | Fuso `America/Sao_Paulo`. Semana começa na segunda 00:00 e termina na próxima segunda 00:00 |
| Aniversário | Mês e dia gravados em UTC, como `birthdayOccurrenceInYear`. 29/02 em ano não bissexto cai em 28/02 |
| Megafone e toasts | Continuam como estão. Este pop-up é outra superfície |
| Convite, e-mail, `.ics`, conta por pessoa | Fora |

## 4. Pop-up de abertura

Ao entrar na área interna, se a data civil de hoje em `America/Sao_Paulo` ainda não estiver gravada em `localStorage` na chave `samps:abertura-vista`, abre um pop-up.

Três blocos. Bloco vazio não renderiza. Os três vazios: o pop-up não abre.

1. **Aniversariantes do mês.** Cliente com `status` `ACTIVE` e usuário com `status` `ACTIVE` cujo mês UTC de nascimento é o mês da data civil de hoje. Nome e dia.
2. **Avisos da semana.** `Announcement` com `active`, `startsAt` anterior ao fim da semana, e `endsAt` nulo ou `endsAt` igual ou posterior ao início da semana. Título e mensagem.
3. **Agenda de hoje.** Os mesmos eventos que `/agenda` já projeta para a data civil de hoje: prazo, entrega, publicação, aniversário, ausência e reunião, inclusive reunião vinda do Google.

Fechar grava a data civil de hoje na chave. Vale até a data mudar. Não há “não mostrar de novo” permanente.

O pop-up não espera o Google. Lê o que já está no Samps.

## 5. Conta Google

Tela em Configurações, visível para `ADMIN` e `MANAGEMENT`.

- Estado desconectado: botão Conectar. OAuth com acesso offline, escopo `https://www.googleapis.com/auth/calendar.events`, calendário `primary`.
- Estado conectado: e-mail da conta Google, “conectado”, botão Desconectar. Desconectar apaga o token e para o sync. Reuniões do Samps e eventos já criados no Google permanecem. Os vínculos ficam guardados para a mesma conta retomar.
- Conectar outra conta no lugar: apaga os vínculos (`sampsKey` e id do evento Google). Não apaga reuniões do Samps nem mexe no calendário antigo. O próximo sync cria os eventos na conta nova.
- Estado revogado: o Google recusou o token. Mesma tela pede reconectar. Agenda e pop-up seguem com dados do Samps.

O refresh token fica cifrado no servidor com a chave `GOOGLE_CALENDAR_TOKEN_KEY`. O texto puro não vai para o cliente, para log nem para auditoria. O access token vive só na memória do pedido de sync.

Uma linha só. O e-mail da conta Google decide: o mesmo e-mail retoma os vínculos; outro e-mail zera os vínculos.

## 6. O que sincroniza

Cada evento que o Samps cria no Google leva as propriedades estendidas `sampsSource` e `sampsKey`. Evento no Google sem `sampsKey` nasceu lá.

Chaves estáveis:

| Origem | `sampsKey` |
|--------|------------|
| Reunião | `meeting:{id}` |
| Aniversário | `birthday:{client\|user}:{id}` |
| Prazo | `due:{demandId}` |
| Entrega | `delivery:{demandId}` |
| Publicação | `publish:{demandId}` |
| Ausência | `absence:{id}` |

**Reunião.** Criar, editar ou apagar no Samps reflete no Google. Criar, editar ou apagar no Google reflete no Samps. Reunião nascida no Google usa `createdById` de quem conectou a conta e `kind` `OTHER`. Título, início, fim, descrição, local e link acompanham o outro lado.

**Projeção.** Aniversário, prazo, entrega, publicação e ausência são calculados no Samps, como hoje. O sync cria ou atualiza o evento o dia inteiro (aniversário) ou no horário já gravado (os demais) no Google. Sumiu no Samps (data limpa, ausência cancelada, cliente ou usuário que deixou de ser `ACTIVE`): apaga no Google. Sumiu ou mudou no Google: o próximo sync recria a partir do Samps. Não altera cliente, demanda nem ausência.

**Checklist.** Prazo de demanda filha entra se `/agenda` já o projeta. Esta fatia não cria regra nova de demanda.

## 7. Quando roda

- Salvar ou apagar reunião no Samps dispara o envio na hora. Se o Google falhar, a reunião salva mesmo assim e fica pendente para o próximo ciclo.
- Projeção (aniversário, prazo, entrega, publicação, ausência) espera o cron ou o botão. Mudar a demanda não chama o Google na hora.
- Cron a cada 15 minutos puxa mudanças do Google, envia projeções e reenvia reuniões pendentes. Rota protegida por `CRON_SECRET`.
- Botão “Sincronizar agora” em `/agenda`, para usuário interno.

Sem linha de conexão, os três caminhos não chamam o Google.

## 8. Erros

- Token revogado: marca a conexão como revogada, não apaga dado local, admin e gestão veem o pedido de reconectar.
- Google fora ou timeout: não apaga evento local, não falha a tela, tenta de novo no cron.
- Sync parcial: o que falhou fica pendente. O que passou não é desfeito.

## 9. Fora desta fatia

- Conta Google por pessoa.
- Convite de participante e e-mail.
- Arquivo `.ics`.
- Google alterar data de cliente, prazo, entrega, publicação ou ausência.
- Portal do cliente.
- Mudar megafone, toast ou o modelo de reunião da fatia 4.3 além dos campos de vínculo.

## 10. Aceite

1. Admin ou gestão conecta uma vez. O acesso segue sem sessão Google no navegador.
2. Reunião criada no Samps aparece no Google. Edição no Google volta ao Samps em até 15 minutos, ou ao clicar em “Sincronizar agora”.
3. Aniversariante do mês aparece no pop-up e como evento de dia inteiro no Google. Mover esse evento no Google não muda o cadastro. O próximo sync devolve a data.
4. Aviso com vigência nesta semana aparece no pop-up.
5. Prazo, entrega, publicação, reunião e ausência de hoje aparecem no pop-up.
6. Fechar o pop-up esconde até o dia civil seguinte.
7. Google desconectado ou fora: pop-up e `/agenda` mostram os dados do Samps.
8. Cliente externo não vê pop-up, botão de sync nem a tela de conexão.

## 11. Testes

- Função pura do pop-up: aniversário deste mês entra; de outro mês fica de fora; aviso que cruza a semana entra; aviso fora da semana fica de fora; evento de outro dia fica de fora da agenda de hoje.
- 29/02 em ano não bissexto entra em fevereiro no dia 28.
- Conflito: reunião com `updated` do Google mais novo vence; empate fica com o Samps; projeção recria o evento do Samps por cima do Google.
- Evento no Google sem `sampsKey` vira reunião `OTHER`.
- Sem conexão, o pop-up devolve só dados do Samps.
- Token revogado não apaga reunião local.

## 12. Ordem

Primeiro o pop-up, que não depende de OAuth. Depois a conta Google e o sync. Os dois cabem nesta spec; o plano pode separar em fatias se o OAuth atrasar.
