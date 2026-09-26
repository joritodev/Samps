# Fatia 3.7 — CSP em modo enforce

> **For agentic workers:** use superpowers:executing-plans ou superpowers:subagent-driven-development task-a-task.

**Goal:** trocar `Content-Security-Policy-Report-Only` por `Content-Security-Policy` em `next.config.mjs`; garantir que todas as telas funcionem sem violação no console.

**Branch:** `sec/csp-enforce` a partir de `master` (após merge do PR #58).

**Metodologia:** execução direta (2 arquivos, sem schema).  
**Gate:** Security Review + smoke manual completo.

---

## Contexto: estado atual

Arquivo: `next.config.mjs`

```js
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",   // unsafe-eval: só dev
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");
// header: Content-Security-Policy-Report-Only
```

Não há scripts externos, CDNs ou analytics. Next.js 14 produção não usa `eval()`.

---

## Global Constraints

- Não afrouxar diretivas existentes (só apertar ou manter).
- `unsafe-eval` pode ser removido em produção; se causar erro, volta.
- Mensagem de aceite: navegação completa sem erro de CSP no console do Chrome.
- Um commit; `npx tsc --noEmit` e `npm run build` limpos.
- Conventional Commits em português.

---

## File map

| Arquivo | Papel |
|---------|-------|
| `next.config.mjs` | trocar header + remover `unsafe-eval` |

---

### Task 1: Trocar de Report-Only para enforce

**Files:**
- Modify: `next.config.mjs`

- [ ] **Step 1: Renomear constante e remover `unsafe-eval`**

Em `next.config.mjs`, trocar:

```js
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");
```

por:

```js
const cspEnforce = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");
```

- [ ] **Step 2: Trocar a chave do header**

Em `securityHeaders`:

```js
{ key: "Content-Security-Policy", value: cspEnforce },
```

(remove a linha antiga com `Content-Security-Policy-Report-Only`)

- [ ] **Step 3: `tsc --noEmit` e `npm run build` — ambos limpos**

- [ ] **Step 4: commit**

```
sec(csp): enforce mode — remove unsafe-eval e troca de Report-Only
```

---

### Task 2: Smoke manual

Abrir cada rota principal no Chrome com DevTools → Console → nenhum erro `Refused to ...`:

- [ ] `/` (home / mural)
- [ ] `/demandas`
- [ ] `/setores/design`
- [ ] `/meu-painel/design`
- [ ] `/agenda`
- [ ] `/performance`
- [ ] `/clientes`
- [ ] `/configuracoes`
- [ ] Abrir um cartão de demanda; trocar aba; comentar

Se aparecer violação de CSP, anotar a diretiva e o recurso bloqueado, ajustar em `cspEnforce` e repetir o smoke antes de commitar.

---

## Critério de saída

- `npm run build` limpo
- Nenhuma violação de CSP no console do Chrome em nenhuma das rotas acima
- Security Review no diff aprovado
