# Fase 2 — Entregáveis da reunião de 28/07 (prazo 18/ago) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar tarefa a tarefa. Os passos usam checkbox (`- [ ]`).

**Goal:** Entregar, antes da reunião de 18/08, os cinco itens que a Samps pediu com nome e sobrenome: dados completos do cliente (endereço e aniversário), aniversariantes na agenda, mural de avisos na abertura da plataforma, registro de ausências da equipe visível para todos, e links de contrato/estudo no painel do cliente. Mais navegabilidade mobile mínima, porque o time vai testar pelo celular.

**Architecture:** Duas migrations Prisma (uma para campos de cliente/usuário, uma para os models novos `Announcement` e `Absence`). Regras de data ficam em helpers puros em `lib/agency/` para poderem ser testadas com Vitest. O mural entra no layout da área interna, então aparece em qualquer rota logada.

**Tech Stack:** Next.js 14 App Router, Server Actions, Prisma 6, PostgreSQL (Neon), shadcn/ui, Tailwind, Vitest.

**Modelo sugerido:** `Opus 5` no desenho das migrations (Tasks 1 e 3, Step 1 de cada). `cursor-grok-4.5-high-fast` no restante das Tasks 1–5. `Auto` na Task 6.

## Global Constraints

- Depende da Fase 1 concluída (CI verde, Vitest disponível, RLS verificado).
- Toda migration entra com `npx prisma migrate dev --name <nome>` e vai no mesmo commit do código que a usa.
- Toda server action nova começa por `requirePermission(...)` ou `requireAuth()`; nenhuma leitura de dado de cliente fora de `withUserScope` quando a rota é acessível a cliente externo.
- Aniversário e endereço são dado pessoal: não aparecem no portal do cliente, não vão para log, não entram em mensagem de erro.
- Helper de data novo entra com teste Vitest no mesmo commit.
- Um commit por tarefa, com `npx tsc --noEmit` e `npm test` limpos.

---

## File map

| Arquivo | Responsabilidade | Tarefa |
|---------|------------------|--------|
| `prisma/schema.prisma` | `Client` (endereço, `birthDate`, `contractDocUrl`, `studyDocUrl`), `User.birthDate` | 1 |
| `lib/agency/client-fields.ts` | schema zod e formatação de endereço/CEP | 1 |
| `app/actions/clients.ts` | persistir os campos novos | 1 |
| `components/agency/clients-view.tsx` | campos no sheet Novo Cliente | 1 |
| `components/agency/client-detail-view.tsx` | exibir/editar dados e documentos | 1, 5 |
| `types/clients-ui.ts` | tipos dos campos novos | 1 |
| `lib/agency/birthdays.ts` | `isBirthdayToday`, `listBirthdaysInRange` | 2 |
| `lib/agency/birthdays.test.ts` | teste dos helpers de aniversário | 2 |
| `lib/agency/agenda-events.ts` | `kind: "birthday" \| "absence"`, `demandId: string \| null` | 2, 4 |
| `app/(agency)/agenda/page.tsx` | juntar demandas + aniversários + ausências | 2, 4 |
| `components/agency/agenda-view.tsx` | render dos kinds novos | 2, 4 |
| `prisma/schema.prisma` | models `Announcement`, `Absence` + enums | 3, 4 |
| `lib/services/announcements.service.ts` | listar avisos ativos, criar, arquivar | 3 |
| `app/actions/announcements.ts` | server actions do mural | 3 |
| `components/agency/announcement-banner.tsx` | banner no topo da área interna | 3 |
| `app/(agency)/layout.tsx` | montar o banner | 3 |
| `app/(agency)/configuracoes/avisos/page.tsx` | gestão dos avisos | 3 |
| `lib/services/absences.service.ts` | criar/listar/cancelar ausência | 4 |
| `app/actions/absences.ts` | server actions de ausência | 4 |
| `components/agency/absence-sheet.tsx` | formulário de ausência | 4 |
| `app/(agency)/equipe/page.tsx` | selo de ausência na lista do time | 4 |
| `components/layout/*` | navegação mobile | 5 |
| `docs/superpowers/notas/2026-08-18-demo-reuniao.md` | roteiro da demo | 6 |

---

## Ordem e dependências

As tarefas não são independentes. Executar nesta ordem e só criar a branch da seguinte depois de a anterior estar mergeada em `master`:

1. **Task 1** — cria `Client.birthDate` e `User.birthDate`. Tasks 2 e 3 não funcionam sem esses campos.
2. **Task 2** — cria `lib/agency/birthdays.ts` e torna `AgendaEvent.demandId` nulável. A Task 3 importa `isBirthdayToday` daqui.
3. **Task 3** — mural de avisos.
4. **Task 4** — ausências; toca `agenda-events.ts` de novo, por isso vem depois da Task 2.
5. **Task 5** — mobile; mexe em componentes que as tarefas anteriores alteraram, então vem por último para não gerar conflito.
6. **Task 6** — demo, com tudo em produção.

---

### Task 1: Dados completos do cliente (endereço, aniversário, documentos)

Pedido literal da reunião: campos de informações básicas e data de aniversário no painel de gestão de clientes, mais links de contrato e estudo no quadro do cliente.

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `lib/agency/client-fields.ts`
- Create: `lib/agency/client-fields.test.ts`
- Modify: `app/actions/clients.ts`
- Modify: `components/agency/clients-view.tsx`
- Modify: `components/agency/client-detail-view.tsx`
- Modify: `types/clients-ui.ts`
- Modify: `app/(agency)/clientes/[id]/page.tsx`

**Interfaces:**
- Consumes: `syncClientContractServices` e `createClient` já existentes (Fase 0, Task 2)
- Produces:
  - campos Prisma em `Client`: `birthDate DateTime?`, `addressZip String?`, `addressStreet String?`, `addressNumber String?`, `addressComplement String?`, `addressDistrict String?`, `addressCity String?`, `addressState String?`, `contractDocUrl String?`, `studyDocUrl String?`
  - campo Prisma em `User`: `birthDate DateTime?`
  - `clientProfileSchema` (zod), `formatAddress(client): string`, `normalizeZip(value: string): string | null`, `isDriveUrl(value: string): boolean`
  - action `updateClientProfile(clientId: string, input: ClientProfileInput)`

- [ ] **Step 1: Branch e schema**

```bash
git checkout master
git pull --ff-only
git checkout -b feat/dados-cliente-endereco-aniversario
```

Em `prisma/schema.prisma`, no model `Client`, depois de `brandColor`:

```prisma
  birthDate               DateTime?
  addressZip              String?
  addressStreet           String?
  addressNumber           String?
  addressComplement       String?
  addressDistrict         String?
  addressCity             String?
  addressState            String?
  contractDocUrl          String?
  studyDocUrl             String?
```

No model `User`, depois de `phone`:

```prisma
  birthDate          DateTime?
```

- [ ] **Step 2: Migration**

```bash
npx prisma migrate dev --name client_profile_address_birthday
```

Esperado: migration criada e aplicada; `prisma generate` roda no fim.

- [ ] **Step 3: Criar `lib/agency/client-fields.ts`**

```ts
import { z } from "zod";

/** CEP fica só com dígitos; 8 dígitos ou nulo. */
export function normalizeZip(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  return digits;
}

export function formatZip(value?: string | null) {
  if (!value || value.length !== 8) return value ?? "";
  return `${value.slice(0, 5)}-${value.slice(5)}`;
}

/** Aceita apenas link do Google Drive/Docs, para não virar campo de texto livre. */
export function isDriveUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return (
      url.hostname === "drive.google.com" ||
      url.hostname === "docs.google.com"
    );
  } catch {
    return false;
  }
}

export function formatAddress(client: {
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressDistrict?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZip?: string | null;
}) {
  const line1 = [client.addressStreet, client.addressNumber]
    .filter(Boolean)
    .join(", ");
  const line2 = [client.addressComplement, client.addressDistrict]
    .filter(Boolean)
    .join(" - ");
  const line3 = [client.addressCity, client.addressState]
    .filter(Boolean)
    .join("/");
  const zip = client.addressZip ? formatZip(client.addressZip) : "";
  return [line1, line2, line3, zip].filter(Boolean).join(" · ");
}

const optionalText = z
  .string()
  .trim()
  .max(180)
  .optional()
  .transform((v) => (v ? v : null));

const optionalDriveUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || isDriveUrl(v), {
    message: "Informe um link do Google Drive ou Google Docs.",
  });

export const clientProfileSchema = z.object({
  birthDate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || !Number.isNaN(Date.parse(v)), {
      message: "Data inválida.",
    }),
  addressZip: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? normalizeZip(v) : null))
    .refine((v) => v === null || v.length === 8, { message: "CEP inválido." }),
  addressStreet: optionalText,
  addressNumber: optionalText,
  addressComplement: optionalText,
  addressDistrict: optionalText,
  addressCity: optionalText,
  addressState: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.toUpperCase() : null))
    .refine((v) => v === null || v.length === 2, {
      message: "Use a sigla do estado (2 letras).",
    }),
  contractDocUrl: optionalDriveUrl,
  studyDocUrl: optionalDriveUrl,
});

export type ClientProfileInput = z.input<typeof clientProfileSchema>;
```

- [ ] **Step 4: Escrever o teste**

`lib/agency/client-fields.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  clientProfileSchema,
  formatAddress,
  isDriveUrl,
  normalizeZip,
} from "./client-fields";

describe("normalizeZip", () => {
  it("aceita cep com mascara", () => {
    expect(normalizeZip("60175-045")).toBe("60175045");
  });
  it("rejeita tamanho errado", () => {
    expect(normalizeZip("123")).toBeNull();
  });
});

describe("isDriveUrl", () => {
  it("aceita drive e docs", () => {
    expect(isDriveUrl("https://drive.google.com/file/d/abc/view")).toBe(true);
    expect(isDriveUrl("https://docs.google.com/document/d/abc")).toBe(true);
  });
  it("recusa host e protocolo fora do esperado", () => {
    expect(isDriveUrl("https://exemplo.com/arquivo")).toBe(false);
    expect(isDriveUrl("http://drive.google.com/x")).toBe(false);
    expect(isDriveUrl("nao-e-url")).toBe(false);
  });
});

describe("formatAddress", () => {
  it("monta o endereco na ordem esperada", () => {
    expect(
      formatAddress({
        addressStreet: "Rua A",
        addressNumber: "100",
        addressDistrict: "Centro",
        addressCity: "Fortaleza",
        addressState: "CE",
        addressZip: "60175045",
      })
    ).toBe("Rua A, 100 · Centro · Fortaleza/CE · 60175-045");
  });
  it("ignora campos vazios", () => {
    expect(formatAddress({ addressCity: "Fortaleza" })).toBe("Fortaleza");
  });
});

describe("clientProfileSchema", () => {
  it("normaliza estado e recusa link fora do drive", () => {
    const ok = clientProfileSchema.parse({ addressState: "ce" });
    expect(ok.addressState).toBe("CE");
    expect(() =>
      clientProfileSchema.parse({ contractDocUrl: "https://exemplo.com/x" })
    ).toThrow();
  });
});
```

- [ ] **Step 5: Rodar o teste e ver falhar/passar**

```bash
npm test
```

Esperado na primeira execução após criar o helper: passa. Se falhar, o helper está divergindo do teste — corrija o helper, não o teste.

- [ ] **Step 6: Action de atualização em `app/actions/clients.ts`**

```ts
export async function updateClientProfile(
  clientId: string,
  input: ClientProfileInput
) {
  const user = await requirePermission("clients.edit");
  await requireClientAccess(clientId);

  const parsed = clientProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  await db.client.update({
    where: { id: clientId },
    data: {
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      addressZip: data.addressZip,
      addressStreet: data.addressStreet,
      addressNumber: data.addressNumber,
      addressComplement: data.addressComplement,
      addressDistrict: data.addressDistrict,
      addressCity: data.addressCity,
      addressState: data.addressState,
      contractDocUrl: data.contractDocUrl,
      studyDocUrl: data.studyDocUrl,
    },
  });

  await logAudit({
    userId: user.id,
    action: AuditAction.UPDATE,
    entity: "Client",
    entityId: clientId,
    summary: "Atualizou dados cadastrais do cliente",
  });

  revalidatePath(`/clientes/${clientId}`);
  return { ok: true };
}
```

Ajuste os nomes de `requirePermission`/`logAudit` para os já usados no arquivo. Se a permissão `clients.edit` não existir no catálogo, use a mesma que `syncClientContractServices` usa.

- [ ] **Step 7: Campos no sheet Novo Cliente**

Em `components/agency/clients-view.tsx`, no `NewClientSheet`, adicionar uma seção **Dados cadastrais** com: data de aniversário (`type="date"`), CEP, rua, número, complemento, bairro, cidade, UF. Todos opcionais. Passar os valores no payload de `createClient` e persistir no `db.client.create` correspondente.

- [ ] **Step 8: Exibir e editar na ficha do cliente**

Em `components/agency/client-detail-view.tsx`:
- Na aba de visão geral, mostrar `formatAddress(client)` e o aniversário formatado (`dd/MM`), com fallback "Não informado".
- Adicionar bloco **Documentos** com os dois links, renderizados como botão externo (`target="_blank"`, `rel="noopener noreferrer"`) quando presentes.
- Reaproveitar o padrão de edição inline já usado na aba Contrato, chamando `updateClientProfile`.

Em `app/(agency)/clientes/[id]/page.tsx`, incluir os campos novos no `select` e no tipo `ClientDetail`; em `types/clients-ui.ts`, adicionar os mesmos campos.

- [ ] **Step 9: Verificar**

```bash
npx tsc --noEmit
npm test
npm run build
```

- [ ] **Step 10: Smoke manual**

1. Criar cliente com aniversário `1990-08-19`, CEP `60175-045`, cidade Fortaleza, UF CE
2. Abrir a ficha: endereço formatado e aniversário aparecem
3. Editar: colar `https://exemplo.com/contrato` no campo de contrato → erro pedindo link do Drive
4. Colar link do Drive válido → salva e vira botão que abre em nova aba
5. Login como `cliente@samps.digital` e abrir `/portal` → nenhum dado de endereço/aniversário aparece

- [ ] **Step 11: Commit e PR**

```bash
git add prisma/schema.prisma prisma/migrations lib/agency/client-fields.ts lib/agency/client-fields.test.ts app/actions/clients.ts components/agency/clients-view.tsx components/agency/client-detail-view.tsx types/clients-ui.ts "app/(agency)/clientes/[id]/page.tsx"
git commit -m "feat(clientes): endereco, aniversario e links de contrato e estudo"
git push -u origin HEAD
gh pr create --title "feat(clientes): dados cadastrais e documentos" --body "Adiciona endereco completo, data de aniversario e links de contrato/estudo (restritos a dominios do Google Drive) na ficha do cliente, com edicao inline e auditoria.

Migration: client_profile_address_birthday.

Teste: criar cliente com aniversario e CEP, editar documentos com link invalido e valido, conferir que o portal do cliente nao expoe esses campos."
```

- [ ] **Step 12: Gates**

**Bugbot** e **Security Review** (`Diff: branch changes`) antes do merge — a fatia mexe em dado pessoal.

---

### Task 2: Aniversariantes na agenda

**Files:**
- Create: `lib/agency/birthdays.ts`
- Create: `lib/agency/birthdays.test.ts`
- Modify: `lib/agency/agenda-events.ts`
- Modify: `app/(agency)/agenda/page.tsx`
- Modify: `components/agency/agenda-view.tsx`

**Interfaces:**
- Consumes: `Client.birthDate`, `User.birthDate` (Task 1); `AgendaEvent` de `lib/agency/agenda-events.ts`
- Produces:
  - `isBirthdayToday(birthDate: Date | string | null | undefined, today?: Date): boolean`
  - `birthdayOccurrenceInYear(birthDate: Date | string, year: number): Date`
  - `mapBirthdaysToAgendaEvents(people: BirthdayPerson[], year: number): AgendaEvent[]` com `BirthdayPerson = { id: string; name: string; birthDate: Date | string; kindOf: "client" | "user" }`
  - `AgendaEventKind` passa a incluir `"birthday"`; `AgendaEvent.demandId` passa a ser `string | null`

- [ ] **Step 1: Branch**

```bash
git checkout master
git pull --ff-only
git checkout -b feat/agenda-aniversariantes
```

- [ ] **Step 2: Escrever o teste primeiro**

`lib/agency/birthdays.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { birthdayOccurrenceInYear, isBirthdayToday } from "./birthdays";

describe("isBirthdayToday", () => {
  it("compara dia e mes ignorando o ano", () => {
    expect(isBirthdayToday("1990-08-19", new Date("2026-08-19T12:00:00Z"))).toBe(
      true
    );
    expect(isBirthdayToday("1990-08-19", new Date("2026-08-20T12:00:00Z"))).toBe(
      false
    );
  });

  it("trata ausencia de data", () => {
    expect(isBirthdayToday(null)).toBe(false);
    expect(isBirthdayToday(undefined)).toBe(false);
  });
});

describe("birthdayOccurrenceInYear", () => {
  it("projeta a data no ano pedido", () => {
    const d = birthdayOccurrenceInYear("1990-08-19", 2026);
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(7);
    expect(d.getUTCDate()).toBe(19);
  });

  it("cai em 28/02 para nascidos em 29/02 em ano nao bissexto", () => {
    const d = birthdayOccurrenceInYear("2000-02-29", 2026);
    expect(d.getUTCMonth()).toBe(1);
    expect(d.getUTCDate()).toBe(28);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
npm test
```

Esperado: FALHA com `Failed to resolve import "./birthdays"`.

- [ ] **Step 4: Implementar `lib/agency/birthdays.ts`**

```ts
import type { AgendaEvent } from "./agenda-events";

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

/** Datas de aniversário são armazenadas em UTC; comparação usa UTC para não virar o dia. */
export function birthdayOccurrenceInYear(
  birthDate: Date | string,
  year: number
) {
  const d = toDate(birthDate);
  const month = d.getUTCMonth();
  const day = d.getUTCDate();
  const isLeapTarget = new Date(Date.UTC(year, 1, 29)).getUTCDate() === 29;
  const safeDay = month === 1 && day === 29 && !isLeapTarget ? 28 : day;
  return new Date(Date.UTC(year, month, safeDay));
}

export function isBirthdayToday(
  birthDate: Date | string | null | undefined,
  today: Date = new Date()
) {
  if (!birthDate) return false;
  const d = toDate(birthDate);
  return (
    d.getUTCMonth() === today.getUTCMonth() &&
    d.getUTCDate() === today.getUTCDate()
  );
}

export type BirthdayPerson = {
  id: string;
  name: string;
  birthDate: Date | string;
  kindOf: "client" | "user";
};

export function mapBirthdaysToAgendaEvents(
  people: BirthdayPerson[],
  year: number
): AgendaEvent[] {
  return people.map((person) => ({
    id: `birthday:${person.kindOf}:${person.id}`,
    demandId: null,
    title:
      person.kindOf === "client"
        ? `Aniversário do cliente ${person.name}`
        : `Aniversário de ${person.name}`,
    clientId: person.kindOf === "client" ? person.id : null,
    clientName: person.kindOf === "client" ? person.name : "Equipe",
    sectorId: null,
    sectorSlug: null,
    sectorName: null,
    kind: "birthday",
    date: birthdayOccurrenceInYear(person.birthDate, year).toISOString(),
    status: "BIRTHDAY",
    assigneeName: person.kindOf === "user" ? person.name : null,
  }));
}
```

- [ ] **Step 5: Ajustar `lib/agency/agenda-events.ts`**

```ts
export type AgendaEventKind = "due" | "delivery" | "publish" | "birthday";

export type AgendaEvent = {
  id: string;
  demandId: string | null;
  // ... resto igual
};

export const AGENDA_KIND_LABEL: Record<AgendaEventKind, string> = {
  due: "Prazo",
  delivery: "Entrega",
  publish: "Publicação",
  birthday: "Aniversário",
};
```

- [ ] **Step 6: Rodar o teste**

```bash
npm test
npx tsc --noEmit
```

Esperado: testes passam. O `tsc` vai apontar todo lugar que assume `demandId: string`; nesses pontos, só navegar para a demanda quando `event.demandId` existir.

- [ ] **Step 7: Alimentar a agenda**

Em `app/(agency)/agenda/page.tsx`:

```tsx
export default async function AgendaPage() {
  const user = await requireAuth();
  const [demands, clients, teammates] = await Promise.all([
    listDemands(user, { context: "calendar" }),
    db.client.findMany({
      where: { status: "ACTIVE", birthDate: { not: null } },
      select: { id: true, name: true, birthDate: true },
    }),
    db.user.findMany({
      where: { status: "ACTIVE", birthDate: { not: null } },
      select: { id: true, name: true, birthDate: true },
    }),
  ]);

  const year = new Date().getUTCFullYear();
  const events = [
    ...mapDemandsToAgendaEvents(demands),
    ...mapBirthdaysToAgendaEvents(
      [
        ...clients.map((c) => ({ ...c, birthDate: c.birthDate!, kindOf: "client" as const })),
        ...teammates.map((u) => ({ ...u, birthDate: u.birthDate!, kindOf: "user" as const })),
      ],
      year
    ),
  ];

  return <AgendaView events={events} />;
}
```

Cliente externo não acessa `/agenda` (rota da área interna), então a consulta direta é aceitável; se a rota passar a ser compartilhada, envolver em `withUserScope`.

- [ ] **Step 8: Render na agenda**

Em `components/agency/agenda-view.tsx`, dar ao kind `birthday` cor própria e ícone, e não renderizar link de demanda quando `demandId` é `null`. Incluir `birthday` nos filtros de tipo de evento existentes.

- [ ] **Step 9: Verificar**

```bash
npm test
npx tsc --noEmit
npm run build
```

- [ ] **Step 10: Smoke manual**

1. Definir o aniversário de um cliente e de um usuário para hoje
2. Abrir `/agenda` no mês atual

Esperado: dois eventos de aniversário no dia de hoje, sem link de demanda, e o filtro de tipo consegue esconder/mostrar eles.

- [ ] **Step 11: Commit e PR**

```bash
git add lib/agency/birthdays.ts lib/agency/birthdays.test.ts lib/agency/agenda-events.ts "app/(agency)/agenda/page.tsx" components/agency/agenda-view.tsx
git commit -m "feat(agenda): exibir aniversarios de clientes e da equipe"
git push -u origin HEAD
gh pr create --title "feat(agenda): aniversariantes" --body "Projeta aniversarios de clientes e da equipe como eventos da agenda (kind birthday), com helper puro testado (inclusive 29/02 em ano nao bissexto). AgendaEvent.demandId passa a aceitar null.

Teste: definir aniversario de um cliente e de um usuario para hoje e conferir a agenda."
```

---

### Task 3: Mural de avisos na abertura da plataforma

Pedido: banner/alerta na página inicial com avisos importantes, aniversariantes do dia e comunicados urgentes para toda a equipe.

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `lib/services/announcements.service.ts`
- Create: `app/actions/announcements.ts`
- Create: `components/agency/announcement-banner.tsx`
- Create: `app/(agency)/configuracoes/avisos/page.tsx`
- Create: `components/agency/announcements-manager.tsx`
- Modify: `app/(agency)/layout.tsx`
- Modify: `app/(agency)/configuracoes/page.tsx` (card de acesso)

**Interfaces:**
- Consumes: `isBirthdayToday` (Task 2); `requirePermission` de `lib/permissions/check`
- Produces:
  - enum Prisma `AnnouncementKind { INFO URGENT CELEBRATION }`
  - model `Announcement { id, title, message, kind, startsAt, endsAt?, authorId, active, createdAt, updatedAt }`
  - `listActiveAnnouncements(now?: Date): Promise<Announcement[]>`
  - `listTodayBirthdays(): Promise<{ id: string; name: string; kindOf: "client" | "user" }[]>`
  - actions `createAnnouncement(input)`, `toggleAnnouncement(id, active)`, `deleteAnnouncement(id)`

- [ ] **Step 1: Branch e schema**

```bash
git checkout master
git pull --ff-only
git checkout -b feat/mural-avisos
```

```prisma
enum AnnouncementKind {
  INFO
  URGENT
  CELEBRATION
}

model Announcement {
  id        String           @id @default(cuid())
  title     String
  message   String
  kind      AnnouncementKind @default(INFO)
  startsAt  DateTime         @default(now())
  endsAt    DateTime?
  active    Boolean          @default(true)
  authorId  String
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt

  author User @relation("AnnouncementAuthor", fields: [authorId], references: [id])

  @@index([active, startsAt])
}
```

No model `User`, adicionar a contraparte:

```prisma
  announcements       Announcement[] @relation("AnnouncementAuthor")
```

- [ ] **Step 2: Migration**

```bash
npx prisma migrate dev --name announcements
```

- [ ] **Step 3: Service**

`lib/services/announcements.service.ts`:

```ts
import { db } from "@/lib/db";
import { isBirthdayToday } from "@/lib/agency/birthdays";

export async function listActiveAnnouncements(now: Date = new Date()) {
  return db.announcement.findMany({
    where: {
      active: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    orderBy: [{ kind: "asc" }, { startsAt: "desc" }],
    include: { author: { select: { name: true } } },
  });
}

export async function listTodayBirthdays() {
  const [clients, users] = await Promise.all([
    db.client.findMany({
      where: { status: "ACTIVE", birthDate: { not: null } },
      select: { id: true, name: true, birthDate: true },
    }),
    db.user.findMany({
      where: { status: "ACTIVE", birthDate: { not: null } },
      select: { id: true, name: true, birthDate: true },
    }),
  ]);

  return [
    ...clients
      .filter((c) => isBirthdayToday(c.birthDate))
      .map((c) => ({ id: c.id, name: c.name, kindOf: "client" as const })),
    ...users
      .filter((u) => isBirthdayToday(u.birthDate))
      .map((u) => ({ id: u.id, name: u.name, kindOf: "user" as const })),
  ];
}
```

- [ ] **Step 4: Server actions**

`app/actions/announcements.ts`, seguindo o padrão dos outros arquivos de action do projeto: `"use server"`, validação zod (`title` 3–120, `message` 3–1000, `kind` no enum, `endsAt` opcional e posterior a `startsAt`), `requirePermission` da mesma permissão usada em configurações (ex.: `settings.manage`), `logAudit` e `revalidatePath("/")` + `revalidatePath("/configuracoes/avisos")`.

- [ ] **Step 5: Banner**

`components/agency/announcement-banner.tsx`: client component que recebe `announcements` e `birthdays`, renderiza no máximo 3 itens, `URGENT` em destaque (variante destrutiva), `CELEBRATION`/aniversariantes em variante suave, com botão de fechar que guarda os IDs vistos em `localStorage` (`samps:avisos-vistos`) para não reaparecer na mesma sessão. Sem aviso e sem aniversariante, não renderiza nada.

- [ ] **Step 6: Montar no layout**

Em `app/(agency)/layout.tsx`, carregar `listActiveAnnouncements()` e `listTodayBirthdays()` e renderizar `<AnnouncementBanner />` acima do `{children}`.

- [ ] **Step 7: Tela de gestão**

`app/(agency)/configuracoes/avisos/page.tsx` + `components/agency/announcements-manager.tsx`: lista dos avisos (título, tipo, vigência, autor, ativo) e formulário de criação. Acrescentar o card de acesso em `app/(agency)/configuracoes/page.tsx` seguindo o padrão dos cards já existentes.

- [ ] **Step 8: Verificar**

```bash
npx tsc --noEmit
npm test
npm run build
```

- [ ] **Step 9: Smoke manual**

1. Em `/configuracoes/avisos`, criar aviso `URGENT` com vigência de hoje
2. Abrir `/demandas` → banner aparece em destaque
3. Fechar o banner e navegar para `/agenda` → não reaparece
4. Criar aviso com `endsAt` de ontem → não aparece
5. Colocar o aniversário de um usuário para hoje → banner de aniversariante aparece
6. Logar como `cliente@samps.digital` → nenhum aviso interno aparece no portal

- [ ] **Step 10: Commit e PR**

```bash
git add prisma/schema.prisma prisma/migrations lib/services/announcements.service.ts app/actions/announcements.ts components/agency/announcement-banner.tsx components/agency/announcements-manager.tsx "app/(agency)/configuracoes/avisos/page.tsx" "app/(agency)/configuracoes/page.tsx" "app/(agency)/layout.tsx"
git commit -m "feat(avisos): mural de comunicados e aniversariantes na area interna"
git push -u origin HEAD
gh pr create --title "feat(avisos): mural de comunicados" --body "Adiciona model Announcement (INFO/URGENT/CELEBRATION) com vigencia, tela de gestao em /configuracoes/avisos e banner no layout da area interna, incluindo aniversariantes do dia. Avisos internos nao aparecem no portal do cliente.

Migration: announcements.

Teste: criar aviso urgente, conferir o banner, fechar e navegar, criar aviso vencido, aniversario de hoje."
```

- [ ] **Step 11: Gates**

**Bugbot** + **Security Review** (`Diff: branch changes`).

---

### Task 4: Registro de ausências da equipe

Pedido: membros sinalizam folga, férias ou indisponibilidade, e isso é visível para o time.

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `lib/agency/absences.ts`
- Create: `lib/agency/absences.test.ts`
- Create: `lib/services/absences.service.ts`
- Create: `app/actions/absences.ts`
- Create: `components/agency/absence-sheet.tsx`
- Modify: `app/(agency)/equipe/page.tsx`
- Modify: `components/agency/team-view.tsx` (ou equivalente já usado por `/equipe`)
- Modify: `app/(agency)/agenda/page.tsx`
- Modify: `lib/agency/agenda-events.ts`

**Interfaces:**
- Consumes: `AgendaEvent` (Task 2)
- Produces:
  - enum Prisma `AbsenceKind { DAY_OFF VACATION OFFLINE SICK_LEAVE }`
  - model `Absence { id, userId, kind, startsAt, endsAt, note?, canceledAt?, createdAt }`
  - `isAbsentOn(absence, day): boolean`, `absenceKindLabel(kind: string): string`
  - `listAbsences(params: { from: Date; to: Date }): Promise<AbsenceWithUser[]>`, `listActiveAbsences(now?: Date)`
  - actions `createAbsence(input)`, `cancelAbsence(id)`
  - `AgendaEventKind` passa a incluir `"absence"`

- [ ] **Step 1: Branch e schema**

```bash
git checkout master
git pull --ff-only
git checkout -b feat/ausencias-equipe
```

```prisma
enum AbsenceKind {
  DAY_OFF
  VACATION
  OFFLINE
  SICK_LEAVE
}

model Absence {
  id         String      @id @default(cuid())
  userId     String
  kind       AbsenceKind
  startsAt   DateTime
  endsAt     DateTime
  note       String?
  canceledAt DateTime?
  createdAt  DateTime    @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, startsAt])
  @@index([startsAt, endsAt])
}
```

No model `User`: `absences Absence[]`.

- [ ] **Step 2: Migration**

```bash
npx prisma migrate dev --name absences
```

- [ ] **Step 3: Teste do helper primeiro**

`lib/agency/absences.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { absenceKindLabel, isAbsentOn } from "./absences";

const ferias = {
  startsAt: new Date("2026-08-10T00:00:00Z"),
  endsAt: new Date("2026-08-14T00:00:00Z"),
  canceledAt: null,
};

describe("isAbsentOn", () => {
  it("inclui o primeiro e o ultimo dia", () => {
    expect(isAbsentOn(ferias, new Date("2026-08-10T23:00:00Z"))).toBe(true);
    expect(isAbsentOn(ferias, new Date("2026-08-14T01:00:00Z"))).toBe(true);
  });

  it("exclui dias fora do intervalo", () => {
    expect(isAbsentOn(ferias, new Date("2026-08-09T12:00:00Z"))).toBe(false);
    expect(isAbsentOn(ferias, new Date("2026-08-15T12:00:00Z"))).toBe(false);
  });

  it("ignora ausencia cancelada", () => {
    expect(
      isAbsentOn({ ...ferias, canceledAt: new Date() }, new Date("2026-08-11T12:00:00Z"))
    ).toBe(false);
  });
});

describe("absenceKindLabel", () => {
  it("traduz os tipos", () => {
    expect(absenceKindLabel("DAY_OFF")).toBe("Folga");
    expect(absenceKindLabel("VACATION")).toBe("Férias");
    expect(absenceKindLabel("OFFLINE")).toBe("Indisponível");
    expect(absenceKindLabel("SICK_LEAVE")).toBe("Atestado");
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

```bash
npm test
```

Esperado: FALHA por import inexistente.

- [ ] **Step 5: Implementar `lib/agency/absences.ts`**

```ts
export const ABSENCE_KIND_LABEL: Record<string, string> = {
  DAY_OFF: "Folga",
  VACATION: "Férias",
  OFFLINE: "Indisponível",
  SICK_LEAVE: "Atestado",
};

export function absenceKindLabel(kind: string) {
  return ABSENCE_KIND_LABEL[kind] ?? kind;
}

function startOfUtcDay(d: Date) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Intervalo inclusivo nas duas pontas, comparado por dia em UTC. */
export function isAbsentOn(
  absence: { startsAt: Date; endsAt: Date; canceledAt?: Date | null },
  day: Date
) {
  if (absence.canceledAt) return false;
  const target = startOfUtcDay(day);
  return (
    target >= startOfUtcDay(absence.startsAt) &&
    target <= startOfUtcDay(absence.endsAt)
  );
}
```

- [ ] **Step 6: Rodar o teste**

```bash
npm test
```

Esperado: PASS.

- [ ] **Step 7: Service e actions**

`lib/services/absences.service.ts` com `listAbsences({ from, to })` (interseção de intervalo, `canceledAt: null`, incluindo `user: { select: { id, name, avatarUrl, sector } }`) e `listActiveAbsences(now)`.

`app/actions/absences.ts`: `createAbsence` valida com zod (`endsAt >= startsAt`, período máximo de 60 dias, `note` até 200 caracteres), permite que o próprio usuário registre para si e que quem tem permissão de gestão registre para outros — nunca um usuário comum para terceiro. `cancelAbsence` segue a mesma regra de dono/gestão. Ambos com `logAudit` e `revalidatePath("/equipe")`.

- [ ] **Step 8: UI**

`components/agency/absence-sheet.tsx`: formulário com tipo, início, fim e observação. Botão de abertura em `/equipe` (para si) e no card do usuário quando quem está logado tem permissão de gestão.

Em `/equipe`, exibir selo com `absenceKindLabel` e o período de quem está ausente hoje, e listar as ausências futuras do time.

- [ ] **Step 9: Ausências na agenda**

Adicionar `"absence"` a `AgendaEventKind` e `AGENDA_KIND_LABEL` (`"Ausência"`), e mapear cada ausência para um evento por dia do intervalo (ou um evento no primeiro dia com o período no título, se o `AgendaView` não suportar evento de múltiplos dias — escolher a opção que o componente já suporta e registrar a escolha na descrição do PR).

- [ ] **Step 10: Verificar**

```bash
npx tsc --noEmit
npm test
npm run build
```

- [ ] **Step 11: Smoke manual**

1. Como `designer@samps.digital`, registrar férias de amanhã até +4 dias
2. Como `social@samps.digital`, abrir `/equipe` → ver o selo de férias do designer
3. Tentar registrar ausência para outro usuário sem permissão → recusado
4. Como gestão, registrar folga para o designer → aceito
5. Abrir `/agenda` → a ausência aparece nos dias corretos
6. Cancelar a ausência → sai de `/equipe` e da agenda

- [ ] **Step 12: Commit e PR**

```bash
git add prisma/schema.prisma prisma/migrations lib/agency/absences.ts lib/agency/absences.test.ts lib/services/absences.service.ts app/actions/absences.ts components/agency/absence-sheet.tsx "app/(agency)/equipe/page.tsx" components/agency/team-view.tsx "app/(agency)/agenda/page.tsx" lib/agency/agenda-events.ts
git commit -m "feat(equipe): registro de folgas, ferias e indisponibilidade"
git push -u origin HEAD
gh pr create --title "feat(equipe): ausencias" --body "Adiciona model Absence (folga, ferias, indisponivel, atestado) com intervalo inclusivo, visivel para todo o time em /equipe e na agenda. Usuario registra para si; registrar para terceiro exige permissao de gestao.

Migration: absences.

Teste: registrar ferias, conferir selo em /equipe e eventos na agenda, tentar registrar para terceiro sem permissao, cancelar."
```

- [ ] **Step 13: Gates**

**Bugbot** + **Security Review** (`Diff: branch changes`) — a fatia cria escrita em nome de outro usuário.

---

### Task 5: Navegabilidade mobile mínima

O time vai testar pelo celular em agosto. Aqui não é redesenho: é garantir que as rotas principais sejam usáveis.

**Files:**
- Modify: componentes de layout em `components/layout/`
- Modify: `components/agency/demand-card.tsx`, `components/board/card-detail-sheet.tsx`, `components/agency/agenda-view.tsx`, `components/agency/client-detail-view.tsx`, `components/agency/clients-view.tsx`

**Interfaces:**
- Consumes: componentes existentes
- Produces: nenhuma API nova

- [ ] **Step 1: Branch**

```bash
git checkout master
git pull --ff-only
git checkout -b fix/mobile-navegabilidade
```

- [ ] **Step 2: Levantar os problemas antes de mexer**

Com o DevTools em 390×844 (iPhone 14), percorrer `/login`, `/demandas`, `/painel-gestao`, um cartão aberto, `/agenda`, `/clientes`, ficha de cliente, `/equipe`, `/configuracoes`. Anotar em `docs/superpowers/notas/2026-08-mobile.md` cada problema com rota, o que quebra e severidade (bloqueia uso / atrapalha / cosmético).

- [ ] **Step 3: Corrigir só o que bloqueia uso**

Padrões a aplicar:
- Sheet/dialog: `w-full sm:max-w-xl` em vez de largura fixa, com `overflow-y-auto` e `max-h-[90dvh]`
- Tabelas: envolver em `<div className="overflow-x-auto">` ou trocar por lista empilhada abaixo de `sm`
- Grids: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` em vez de colunas fixas
- Navegação: menu lateral em `Sheet` no mobile, com botão de abrir na barra superior
- Área de toque: botões e itens de menu com pelo menos 40px de altura
- Quadro kanban: rolagem horizontal com `snap-x` em vez de colunas comprimidas

- [ ] **Step 4: Verificar**

```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 5: Reconferir cada rota em 390×844**

Esperado: nenhum item marcado como "bloqueia uso" permanece; overflow horizontal só onde é intencional (kanban).

- [ ] **Step 6: Commit e PR**

```bash
git add components docs/superpowers/notas/2026-08-mobile.md
git commit -m "fix(mobile): tornar rotas principais navegaveis em telas pequenas"
git push -u origin HEAD
gh pr create --title "fix(mobile): navegabilidade" --body "Corrige os bloqueios de uso em 390x844 nas rotas principais: sheets de largura fixa, tabelas sem rolagem, grids com colunas fixas, menu lateral e area de toque. Itens cosmeticos ficam registrados em docs/superpowers/notas/2026-08-mobile.md para a Fase 3.

Teste: percorrer login, demandas, painel-gestao, cartao, agenda, clientes, ficha, equipe e configuracoes em 390x844."
```

---

### Task 6: Preparar a demo do dia 18

**Files:**
- Create: `docs/superpowers/notas/2026-08-18-demo-reuniao.md`

**Interfaces:**
- Consumes: Tasks 1–5 mergeadas e em produção
- Produces: roteiro de demo e lista do que ficou para setembro

- [ ] **Step 1: Deploy e verificação em produção**

```bash
git checkout master
git pull --ff-only
npx vercel --prod
```

Depois, com a proteção da Vercel liberada para você: percorrer as cinco entregas em produção, inclusive pelo celular.

- [ ] **Step 2: Escrever o roteiro**

`docs/superpowers/notas/2026-08-18-demo-reuniao.md`:

```markdown
# Demo 18/08 — roteiro

## Entregue nesta rodada
1. Dados do cliente: endereço, aniversário e links de contrato/estudo — mostrar na ficha
2. Aniversariantes na agenda — mostrar o mês atual
3. Mural de avisos — criar um aviso urgente ao vivo e mostrar aparecendo
4. Ausências da equipe — registrar uma folga e mostrar em /equipe e na agenda
5. Uso pelo celular — abrir no telefone durante a reunião

## Já existia e vale reforçar
- Cronômetro por demanda, link do Drive obrigatório na entrega, geração automática de cartões por contrato, portal do cliente

## Em andamento para setembro
- Relatórios de performance por usuário e por tipo
- Anexos nas demandas
- Categorias padronizadas de vídeo com briefing obrigatório
- Visibilidade aberta das demandas (confirmar a regra com a Samps)

## Precisamos da Samps
- Regras de pontuação e priorização das demandas
- Definição do que "remover a restrição" significa na prática
- Categorias de vídeo que a equipe usa hoje
- Se o teste vai usar dado de cliente real (muda o isolamento do banco)
```

- [ ] **Step 3: Commit**

```bash
git checkout -b docs/demo-18-ago
git add docs/superpowers/notas/2026-08-18-demo-reuniao.md
git commit -m "docs: roteiro da demo de 18/08 e pendencias para setembro"
git push -u origin HEAD
```

---

## Critério de saída da Fase 2

1. Cliente com endereço, aniversário e links de documentos, com link restrito a domínios do Google
2. Aniversários de clientes e da equipe na agenda
3. Mural de avisos aparecendo na área interna, com gestão em `/configuracoes/avisos`
4. Ausências registráveis e visíveis para o time em `/equipe` e na agenda
5. Rotas principais usáveis em 390×844
6. `npm test`, `npx tsc --noEmit` e `npm run build` limpos; CI verde
7. Deploy em produção feito e roteiro da demo escrito
