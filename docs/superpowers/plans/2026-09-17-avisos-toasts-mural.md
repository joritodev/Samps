# Mural de avisos + pop-ups — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tirar a faixa permanente de avisos, colocar o mural num megafone e avisar na hora com pop-ups (aviso especial vs notificação operacional), com som opcional.

**Architecture:** Helpers puros de diff/prefs; uma server action de poll; host cliente no layout da agência dispara sonner + Web Audio; popover do mural substitui `AnnouncementBanner` no topo da página.

**Tech Stack:** Next.js 14 App Router, Sonner já no layout, Vitest, localStorage/sessionStorage, Web Audio API.

**Spec:** `docs/superpowers/specs/2026-09-17-avisos-toasts-mural-design.md`

## Global Constraints

- Cópia em português, sentence case, sem emoji em commits.
- Sem WebSocket, push, e-mail ou arquivos de som em `public/`.
- Sem schema Prisma novo; prefs de delivery entram no JSON `notificationPrefs` existente.
- Portal do cliente não muda.
- `npx tsc --noEmit` limpo por task; Conventional Commits em português.
- Toast só para IDs que apareceram **depois** do baseline da sessão.
- Urgente nunca usa variante `destructive` do Alert.
- Som default off; toast visual default on.
- Aniversários só no mural, sem toast.

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---------|------------------|
| `lib/agency/live-alerts.ts` | Diff de IDs, ids de mural, remember |
| `lib/agency/live-alerts.test.ts` | Testes do diff |
| `lib/services/notifications.service.ts` | Prefs de delivery no parse/default |
| `lib/services/notifications.service.test.ts` | Testes do parse (criar se não existir) |
| `app/actions/live-alerts.ts` | Poll autenticado |
| `lib/actions/settings.actions.ts` | Aceitar as 4 chaves novas no save |
| `components/agency/mural-popover.tsx` | Megafone + lista |
| `components/agency/live-alerts-host.tsx` | Poll, toasts, som, mudo |
| `components/agency/announcement-banner.tsx` | Deixar de ser usado no layout (pode permanecer sem import) |
| `components/agency/agency-sidebar.tsx` | Megafone + mudo ao lado do sino |
| `app/(agency)/layout.tsx` | LiveAlertsHost; sem banner |
| `components/agency/notification-settings.tsx` | Seção alertas na tela |
| `components/agency/announcements-manager.tsx` | Copy + preview |
| `app/(agency)/configuracoes/avisos/page.tsx` | Título/subtítulo |

---

### Task 1: Helpers de diff e prefs de delivery

**Files:**
- Create: `lib/agency/live-alerts.ts`
- Create: `lib/agency/live-alerts.test.ts`
- Modify: `lib/services/notifications.service.ts`
- Create: `lib/services/notifications.prefs.test.ts`

**Interfaces:**
- Consumes: nenhum
- Produces: `diffNewIds`, `rememberIds`, `muralAnnouncementId`, `muralBirthdayId`, `NotificationPrefs` com as 4 chaves de delivery, `parseNotificationPrefs`, `DEFAULT_NOTIFICATION_PREFS`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { diffNewIds, rememberIds, muralBirthdayId } from "./live-alerts";

describe("live-alerts", () => {
  it("no primeiro snapshot nada é novo", () => {
    expect(diffNewIds(["a", "b"], [])).toEqual(["a", "b"]);
  });

  it("depois do baseline só o id novo entra", () => {
    const seen = rememberIds([], ["a", "b"]);
    expect(diffNewIds(["a", "b", "c"], seen)).toEqual(["c"]);
  });

  it("id de aniversário é estável", () => {
    expect(muralBirthdayId({ id: "u1", kindOf: "user" })).toBe(
      "birthday:user:u1"
    );
  });
});
```

Em `notifications.prefs.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFICATION_PREFS,
  parseNotificationPrefs,
} from "./notifications.service";

describe("parseNotificationPrefs delivery", () => {
  it("default: toast ligado, som desligado", () => {
    const p = parseNotificationPrefs(null);
    expect(p.toastAnnouncements).toBe(true);
    expect(p.soundAnnouncements).toBe(false);
    expect(p.toastNotifications).toBe(true);
    expect(p.soundNotifications).toBe(false);
    expect(p.DEADLINE).toBe(true);
  });

  it("respeita false explícito no toast e true no som", () => {
    const p = parseNotificationPrefs({
      toastAnnouncements: false,
      soundAnnouncements: true,
    });
    expect(p.toastAnnouncements).toBe(false);
    expect(p.soundAnnouncements).toBe(true);
    expect(p.ASSIGNMENT).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL** (módulo live-alerts inexistente; parse sem as chaves)

Run: `npx vitest run lib/agency/live-alerts.test.ts lib/services/notifications.prefs.test.ts`

- [ ] **Step 3: Implement**

`lib/agency/live-alerts.ts`:

```ts
export function muralAnnouncementId(id: string) {
  return `announcement:${id}`;
}

export function muralBirthdayId(b: { id: string; kindOf: "client" | "user" }) {
  return `birthday:${b.kindOf}:${b.id}`;
}

export function rememberIds(seen: string[], ids: string[]): string[] {
  return Array.from(new Set([...seen, ...ids]));
}

export function diffNewIds(current: string[], seen: string[]): string[] {
  const set = new Set(seen);
  return current.filter((id) => !set.has(id));
}
```

Em `notifications.service.ts` estender tipos e parse:

```ts
export type DeliveryPrefKey =
  | "toastAnnouncements"
  | "soundAnnouncements"
  | "toastNotifications"
  | "soundNotifications";

export type NotificationPrefs = Record<NotificationPrefGroup, boolean> &
  Record<DeliveryPrefKey, boolean>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  DEADLINE: true,
  ASSIGNMENT: true,
  ADJUSTMENT: true,
  PUBLICATION: true,
  OTHER: true,
  toastAnnouncements: true,
  soundAnnouncements: false,
  toastNotifications: true,
  soundNotifications: false,
};
```

`parseNotificationPrefs`: grupos `!== false`; toast keys `!== false`; sound keys `=== true`.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(avisos): diff de toasts e preferencias de delivery"
```

---

### Task 2: Action de poll

**Files:**
- Create: `app/actions/live-alerts.ts`
- Modify: `lib/actions/settings.actions.ts` (aceitar as 4 chaves)

**Interfaces:**
- Consumes: `listActiveAnnouncements`, `listTodayBirthdays`, `listUserNotifications`, `parseNotificationPrefs`, `clientScopeFilter`
- Produces: `pollLiveAlertsAction(): Promise<LiveAlertsPayload>`

- [ ] **Step 1: Write a contract test** in `app/actions/live-alerts.test.ts` that mocks db/auth is optional; se o padrão do repo for não testar actions com db, pular o arquivo de action e validar o tipo exportado num teste puro de shape em `lib/agency/live-alerts.test.ts`:

```ts
it("payload lista ids de mural a partir de announcements e birthdays", () => {
  const announcements = [{ id: "a1" }];
  const birthdays = [{ id: "u1", kindOf: "user" as const }];
  const ids = [
    ...announcements.map((a) => muralAnnouncementId(a.id)),
    ...birthdays.map((b) => muralBirthdayId(b)),
  ];
  expect(ids).toEqual(["announcement:a1", "birthday:user:u1"]);
});
```

Adicionar esse teste no arquivo da Task 1 se ainda não estiver.

- [ ] **Step 2: Implement `pollLiveAlertsAction`**

```ts
"use server";

import { requireAuth } from "@/lib/permissions/check";
import { clientScopeFilter } from "@/lib/permissions/check";
import {
  listActiveAnnouncements,
  listTodayBirthdays,
} from "@/lib/services/announcements.service";
import {
  listUserNotifications,
  parseNotificationPrefs,
} from "@/lib/services/notifications.service";
import { db } from "@/lib/db";

export async function pollLiveAlertsAction() {
  const user = await requireAuth();
  const [announcements, birthdays, notifications, row] = await Promise.all([
    listActiveAnnouncements(),
    listTodayBirthdays(clientScopeFilter(user)),
    listUserNotifications(user.id, true),
    db.user.findUnique({
      where: { id: user.id },
      select: { notificationPrefs: true },
    }),
  ]);
  return {
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      kind: a.kind,
    })),
    birthdays,
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      link: n.link,
      createdAt: n.createdAt.toISOString(),
    })),
    prefs: parseNotificationPrefs(row?.notificationPrefs),
  };
}
```

Corrigir import de `clientScopeFilter` para o path real (`@/lib/permissions/check`).

Estender `updateNotificationPrefsAction` input com as 4 booleans.

- [ ] **Step 3: tsc**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(avisos): action de poll do mural e notificacoes"
```

---

### Task 3: Megafone + host de toasts + layout

**Files:**
- Create: `components/agency/mural-popover.tsx`
- Create: `components/agency/live-alerts-host.tsx`
- Create: `components/agency/mural-popover.test.tsx`
- Modify: `components/agency/agency-sidebar.tsx`
- Modify: `app/(agency)/layout.tsx`

**Interfaces:**
- Consumes: `pollLiveAlertsAction`, helpers Task 1
- Produces: UI mural + toasts

- [ ] **Step 1: Teste de ausência da faixa e presença do megafone**

`mural-popover.test.tsx` (jsdom): render com 1 aviso, espera título e botão Dispensar; `aria-label` contendo "Mural".

- [ ] **Step 2: Implement MuralPopover**

Client component: props iniciais `announcements` e `birthdays` (mesmo tipo do banner atual). Estado dismissed via `samps:avisos-vistos`. Popover (DropdownMenu ou Popover shadcn). Badge com count. Dispensar atualiza localStorage.

Ícone: `Megaphone` lucide. Não usar `Alert` `destructive`.

Urgente: `border-amber-300 bg-amber-50` (e dark equivalentes). Celebração: fuchsia como hoje.

- [ ] **Step 3: Implement LiveAlertsHost**

- Estado: `seen` no sessionStorage `samps:toasts-vistos`, flag `samps:toast-baseline`.
- Mudo: `samps:avisos-mudo` (`"1"` = mudo), botão pode viver no sidebar: exportar `SessionMuteButton` do mesmo arquivo ou arquivo irmão `session-mute-button.tsx`.
- `useEffect` poll 20s + `document.visibilitychange`.
- Primeiro poll: `rememberIds` de `announcement:{id}` e `notification:{id}`; grava seen; não toasta.
- Polls seguintes: `diffNewIds`; para cada announcement nova, se `prefs.toastAnnouncements`, `toast.custom` especial; se som e !mudo e !hidden, `playAlertTone("announcement")`. Notificações idem com `toastNotifications`.
- Aniversários nunca entram no diff de toast.
- Máx 3 toasts: sonner `visibleToasts={3}`.

`playAlertTone`:

```ts
export function playAlertTone(kind: "announcement" | "notification") {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = kind === "announcement" ? 880 : 660;
  gain.gain.value = 0.08;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  const ms = kind === "announcement" ? 180 : 120;
  setTimeout(() => {
    osc.stop();
    void ctx.close();
  }, ms);
}
```

- [ ] **Step 4: Layout**

Remover `<AnnouncementBanner ... />` de `app/(agency)/layout.tsx`. Passar announcements/birthdays para o sidebar (MuralPopover precisa dados no SSR). LiveAlertsHost no layout (sem props SSR obrigatórias — ele poll).

AgencySidebar: receber `announcements` e `birthdays`, render `MuralPopover` + mute entre busca e sino.

- [ ] **Step 5: Teste UI** `npx vitest run components/agency/mural-popover.test.tsx`

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(avisos): mural no megafone e pop-ups ao vivo"
```

---

### Task 4: Cadastro e preferências

**Files:**
- Modify: `components/agency/announcements-manager.tsx`
- Modify: `app/(agency)/configuracoes/avisos/page.tsx`
- Modify: `components/agency/notification-settings.tsx`
- Create: `components/agency/announcements-manager.test.tsx`

**Interfaces:**
- Consumes: `NotificationPrefs` da Task 1
- Produces: copy e preview

- [ ] **Step 1: Teste** espera strings "Publicar agora", "destaque no mural", "Avisos gerais"

- [ ] **Step 2: Implement copy + preview estático do tipo no form** (caixa ao lado do select, não envia)

- [ ] **Step 3: Settings** — seção “Alertas na tela” com 4 switches; save manda as chaves novas + grupos

- [ ] **Step 4: vitest + tsc**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(avisos): cadastro e preferencias de pop-up e som"
```

---

### Task 5: Gates e smoke no browser

- [ ] `npx tsc --noEmit`
- [ ] `npm run lint`
- [ ] `npx vitest run lib/agency/live-alerts.test.ts lib/services/notifications.prefs.test.ts components/agency/mural-popover.test.tsx components/agency/announcements-manager.test.tsx`
- [ ] `npm run build` se rotas/layout mudaram
- [ ] agent-browser: login seed, `/notificacoes` sem faixa de mural, megafone visível

---

## Spec coverage checklist

| Requisito | Task |
|-----------|------|
| Sem faixa permanente | 3 |
| Megafone + dispensar | 3 |
| Toast aviso especial após baseline | 3 |
| Toast operacional | 3 |
| Som opcional + mudo | 3 + 4 |
| Prefs JSON | 1 + 2 + 4 |
| Cadastro claro | 4 |
| Sem toast de aniversário | 3 |
| Poll 20s | 3 |
| Cliente externo | layout portal intocado (nenhuma task) |
