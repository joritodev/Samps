# Spec — Mural de avisos + pop-ups (toasts)

**Data:** 2026-09-17  
**Status:** Aprovado na sessão (abordagem A)  
**Origem:** print do mural em `/notificacoes` (faixas vermelhas empilhadas) + pedido de pop-up tipo Windows  
**Plano:** `docs/superpowers/plans/2026-09-17-avisos-toasts-mural.md`

## 1. Problema

O mural de avisos gerais (Fase 2) renderiza até 3 `Alert` no topo de **todas** as telas da área interna. No print: borda vermelha, dois cartões altos, competindo com a lista de notificações operacionais. Quem cadastra em `/configuracoes/avisos` não vê preview do tipo; “Urgente” usa a variante `destructive` do Alert e parece erro do sistema.

Notificações operacionais só aparecem na página `/notificacoes` e no badge do sino; não há aviso na hora em que nascem. Não há som.

## 2. Objetivo

1. Tirar a faixa permanente do layout.
2. Mural (avisos + aniversários do dia) num **megafone** ao lado do sino.
3. Pop-up especial quando um aviso geral passa a valer **depois** que a sessão abriu.
4. Pop-up menor quando chega notificação operacional nova na sessão.
5. Som opcional nos dois, com silenciar na sessão e preferências persistentes.
6. Cadastro de avisos mais claro (tipo, vigência, preview).

## 3. Decisões travadas

| Tema | Escolha |
|------|---------|
| Abordagem | A — megafone + toasts; sem faixa permanente |
| Aniversário | Só no mural; **sem** toast |
| Toast atrasado | Não. Baseline no 1º poll da sessão: IDs atuais entram em “já vistos”, sem toast |
| Poll | 20s + quando a aba volta a `visible` |
| Som padrão | Desligado |
| Pop-up visual padrão | Ligado (avisos e notificações) |
| Som | Web Audio (dois tons curtos). Sem arquivo em `public/` |
| Mudo da sessão | Botão no header, `sessionStorage` `samps:avisos-mudo` |
| Dispensar mural | `localStorage` `samps:avisos-vistos` (já existe) |
| IDs toastados | `sessionStorage` `samps:toasts-vistos` |
| Tempo real | Sem WebSocket / SSE / push / e-mail nesta fatia |
| Portal do cliente | Continua sem mural interno |
| Urgente | Destaque âmbar, **não** `destructive` |
| Máx. toasts empilhados | 3 (fila do sonner) |

## 4. Experiência

### Header (sidebar, ao lado da busca)

- **Sino** — inalterado (link `/notificacoes` + badge de não lidas).
- **Megafone** — abre popover “Mural”. Badge = avisos ativos + aniversários do dia **ainda não dispensados**. Sem itens, sem badge; ícone permanece.
- **Som** — botão liga/muda mudo da sessão (`aria-pressed`). Não persiste entre abas/sessões.

### Popover do mural

- Seções: “Avisos gerais” e “Aniversários hoje”.
- Item: título, mensagem, chip de tipo (Informativo / Urgente / Celebração).
- Ação: Dispensar (grava id em `samps:avisos-vistos`).
- Vazio: “Nenhum aviso no mural.”

### Toast de aviso geral

- Maior que o operacional.
- Ícone megafone, título, mensagem (até ~2 linhas), chip do tipo.
- Urgente: fundo/borda âmbar; Informativo: superfície padrão; Celebração: fuchsia suave (já usada no banner).
- Ações: Dispensar (fecha e marca mural) e “Ver mural” (abre o popover).

### Toast operacional

- Título + uma linha + link se houver.
- Clique no toast ou no link navega.

### Configurações → Notificações

Nova seção “Alertas na tela”, depois dos grupos atuais:

| Chave JSON | Label | Default |
|------------|-------|---------|
| `toastAnnouncements` | Pop-up de avisos gerais | true |
| `soundAnnouncements` | Som de avisos gerais | false |
| `toastNotifications` | Pop-up de notificações | true |
| `soundNotifications` | Som de notificações | false |

### Configurações → Avisos

- Título da página: “Avisos gerais”.
- Subtítulo: “Comunicados para a equipe. Aparecem no megafone e, se a pessoa já estiver logada, num pop-up.”
- Tipo: select + preview estático do toast (não envia).
- Vigência: “Publicar agora” (início vazio) vs “Agendar” (datetime). Fim opcional com texto “some do mural depois desta data”.
- Urgente: texto “destaque no mural; não é um erro do sistema.”

## 5. Arquitetura

```
AgencyLayout
  ├─ (remove AnnouncementBanner)
  ├─ AgencySidebar
  │    GlobalSearch | MuralPopover | NotificationBell | SessionMuteButton
  └─ LiveAlertsHost  (cliente, invisível)
       poll pollLiveAlertsAction a cada 20s + visibilitychange
       sonner + Web Audio
```

**`pollLiveAlertsAction`** (autenticado, área interna):

```ts
{
  announcements: { id, title, message, kind }[];
  birthdays: { id, name, kindOf: "client" | "user" }[];
  notifications: { id, title, message, link, createdAt }[];
  prefs: NotificationPrefs; // grupos + delivery
}
```

Aniversários usam o mesmo `listTodayBirthdays` (escopo de cliente do usuário). Notificações: não lidas, `take: 20`, mais recentes.

**`lib/agency/live-alerts.ts`** (puro):

- `diffNewIds(currentIds, seenIds) => newIds`
- `rememberIds(seenIds, ids) => nextSeen`
- `muralItemId(announcement | birthday)` — birthday continua `birthday:{kindOf}:{id}`

**Som:** `playAlertTone("announcement" | "notification")` via `AudioContext`. Aviso: 880 Hz, 180 ms. Operacional: 660 Hz, 120 ms. Se `AudioContext` falhar ou autoplay bloquear: silêncio. Não toca se `document.hidden` ou mudo da sessão ou pref off.

**Erro:** falha de poll não mostra toast de erro; tenta de novo no próximo intervalo.

## 6. Fora de escopo

- Push mobile, e-mail, WebSocket.
- Marcar notificação como lida ao fechar o toast (continua na caixa até abrir `/notificacoes` — YAGNI; o badge do sino já existe).
- Mural no portal do cliente.
- Histórico de avisos dispensados no servidor.

## 7. Aceite

1. `/notificacoes` (e qualquer tela interna) **não** mostra faixa de avisos no topo.
2. Megafone lista avisos ativos e aniversários; dispensar some o item e o badge.
3. Com a sessão já aberta, publicar aviso em `/configuracoes/avisos` → em até ~20s (ou ao voltar à aba) pop-up especial na outra sessão logada (ou na mesma, se o poll rodar).
4. Notificação operacional nova na sessão → toast menor (se pref ligada).
5. Som só com pref ligada **e** mudo da sessão off.
6. Cliente externo não vê megafone/toasts de mural (layout portal inalterado).

## 8. Testes

- Unit: `diffNewIds` / `rememberIds` / parse de prefs de delivery (default toast on, som off).
- UI: mural sem faixa; manager tem “Publicar aviso” e texto de urgente.
- Manual / agent-browser: login `admin@` ou `gestao@`, `/notificacoes` sem `Alert` de mural; megafone visível; criar aviso e ver toast após poll.
