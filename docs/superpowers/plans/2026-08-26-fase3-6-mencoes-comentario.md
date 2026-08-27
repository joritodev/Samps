# Fatia 3.6 — Menções @usuario Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Comentário com `@nome` notifica o usuário mencionado; sino já mostra não lidas (existente).

**Architecture:** Parser puro testável extrai tokens `@…` do texto. `notifyMentionedUsers` resolve nomes contra usuários internos ativos e chama `createNotification` (tipo `NEW_COMMENT`, grupo ADJUSTMENT). Wiring centralizado em `addCardComment` — único ponto de criação de comentários em cartão.

**Spec:** `docs/superpowers/specs/2026-08-16-fase3-gestao-agencia-design.md` (§3 ordem 3.6, §2 WhatsApp)

**Branch:** `feat/mencoes-comentario` · Worktree: `.worktrees/feat-mencoes-comentario`

## Global Constraints

- Sem schema/migration Prisma (sem novo NotificationType).
- Sem chat, sem e-mail nesta fatia.
- Sem alterar RLS.
- Matching: case-insensitive, trim; nomes com espaço via `@Maria Silva` (regex até pontuação/fim).
- Não notificar o autor do comentário; não notificar usuário inexistente (silencioso).
- Não notificar duplicata se mesmo usuário mencionado 2×.
- Link da notificação: `/clientes/{clientId}/quadro` se `clientId` disponível, senão `/notificacoes`.
- Conventional Commits pt-BR; 1 commit/task.
- Gates: tsc, test, lint, build.

## File map

| Arquivo | Responsabilidade |
|---------|------------------|
| `lib/agency/mention-parser.ts` | `extractMentionTokens(text): string[]` |
| `lib/agency/mention-parser.test.ts` | Vitest |
| `lib/services/mentions.service.ts` | `resolveMentionedUserIds`, `notifyCommentMentions` |
| `lib/services/mentions.service.test.ts` | Vitest resolução (sem DB) |
| `lib/services/cards.service.ts` | Chamar notify após comment |
| `lib/actions/cards.actions.ts` | Passar `clientId` + author para notify |
| `components/board/card-detail-sheet.tsx` | Placeholder/hint @nome (mínimo) |

---

### Task 1: Parser de menções (TDD)

**Produces:**
```ts
/** Tokens after @, trimmed, deduped, order preserved. */
export function extractMentionTokens(text: string): string[]
```

Examples: `"Oi @Maria Silva, veja"` → `["Maria Silva"]`; `"@joao e @JOAO"` → `["joao"]` deduped case-insensitive in resolver not parser.

- [ ] Tests + implement
- [ ] Commit: `feat(comentarios): parser de mencoes @usuario`

---

### Task 2: Resolver + notificar

**Produces:**
```ts
export function resolveMentionedUserIds(
  tokens: string[],
  candidates: { id: string; name: string }[],
  excludeUserId?: string
): string[]

export async function notifyCommentMentions(params: {
  text: string;
  authorUserId: string;
  authorName: string;
  demandTitle: string;
  clientId?: string;
  demandId: string;
}): Promise<void>
```

- Lookup active internal users (`userType !== EXTERNAL_CLIENT`, `active: true`) — query in service.
- Notification: `NEW_COMMENT`, title `Você foi mencionado`, message truncate comment preview, link to board.

- [ ] Tests for resolve (pure); integration via cards.service optional
- [ ] Commit: `feat(comentarios): notificacao ao mencionar usuario`

---

### Task 3: Wiring addCardComment + hint UI

- `addCardComment` accepts optional `{ authorName, clientId, demandTitle }` OR notify called from action after fetch demand title/client.
- Prefer: extend `addCommentAction` to load demand (title, clientId) then call notify after addCardComment.
- Textarea placeholder: `Comentário… Use @nome para mencionar alguém.`

- [ ] Commit: `feat(comentarios): wiring de mencoes no quadro cliente`

---

### Task 4: Gates + PR

- [ ] tsc, test, lint, build
- [ ] Push + PR `feat(comentarios): mencoes @usuario com notificacao`
- [ ] Não mergear

---

## Fora desta fatia

- Menções em adjustment.service / review.ts comments
- Autocomplete @ no textarea
- E-mail urgente
- Novo NotificationType MENTION
