# Dependências — política e estado (ago/2026)

## Estado
- next: 14.2.35 (antes: 14.2.15, com CVE — GHSA-f82v-jwr5-mffw, "Authorization Bypass in Next.js Middleware", CVE-2025-29927)
- eslint-config-next: 14.2.35 (antes: 14.2.15)
- npm audit high/critical em produção: a vulnerabilidade **crítica** original (`next` 0.9.9 - 16.3.0-preview.10) foi eliminada — o `npm audit` deixou de listar a severidade `critical` após o upgrade. Restam **6 vulnerabilidades `high`**, detalhadas abaixo.
- pendências sem patch em 14.x (todas `high`, sem fix disponível dentro do major 14 — só em `next@16.3.0`):
  - `next` (dependência de produção): 12 advisories `high` residuais no range `9.3.4-canary.0 - 16.3.0-preview.10` (DoS em Server Actions/Server Components, SSRF em rewrites/WebSocket/Server Actions, cache poisoning em RSC, XSS em CSP nonces e scripts `beforeInteractive`, disclosure de Server Function endpoints, etc.). Vetor: exploração via requisições HTTP/App Router em produção. Sem patch dentro do 14.x — fix apenas em `next@16.3.0` (major).
  - `postcss` (dependência de dev, via `next/node_modules/postcss`): XSS/path traversal via `sourceMappingURL` (GHSA-qx2v-qp2m-jg93 e relacionados). Vetor: build-time/dev, não afeta runtime de produção. Sem patch dentro do 14.x.
  - `glob` (dependência de dev, via `eslint-config-next` → `@next/eslint-plugin-next`): command injection na CLI (GHSA-5j98-mcp5-4vw2). Vetor: uso da CLI do `glob`, não é exercitado pelo nosso lint/build. Sem patch dentro do 14.x (fix força `eslint-config-next@16.3.0`).
  - `brace-expansion` (dependência de dev, via `@typescript-eslint`/`glob`): DoS por expansão ilimitada (GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895). Vetor: dev-only, tem fix via `npm audit fix` mas o patch ainda deixa o `next`/`glob` acima sem correção — não é a causa do `audit --audit-level=high` continuar falhando.
  - **Proposta:** upgrade de major do Next (14 → 16) como tarefa própria da Fase 3, com plano e smoke completo, para eliminar as pendências `high` restantes.

## O que foi executado
- `npm audit --audit-level=moderate` (antes) e `npm audit --audit-level=high` (depois) — depois ainda retorna exit code 1 (6 `high`, 0 `critical`; comparado com 5 `high` + 1 `critical` antes).
- `npm view next dist-tags` / `npm view next versions --json` — confirmado `14.2.35` como último patch publicado no major 14 (tag `next-14`).
- `npx tsc --noEmit` — limpo.
- `npm run lint` — limpo (`✔ No ESLint warnings or errors`). Corrigido um conflito de plugin `@next/next` causado por dois `.eslintrc.json` resolvidos (raiz do repo principal + worktree) com versões diferentes do `eslint-config-next`; adicionado `"root": true` ao `.eslintrc.json` do projeto para impedir o ESLint de subir a árvore de diretórios além do worktree.
- `npm run build` — build de produção concluído com sucesso (apenas warnings pré-existentes do `next-auth`/`jose` sobre APIs não suportadas no Edge Runtime, não relacionados a este upgrade).
- Smoke manual (via `npm run dev`, sem sessão autenticada disponível no ambiente): `/`, `/agenda` e `/configuracoes` retornaram HTTP 200, redirecionando corretamente para `/login` (rotas protegidas); nenhum erro de runtime no console do servidor.

## Política
- `npm audit --audit-level=high` roda no CI a cada PR.
- Upgrade de patch/minor de segurança: aplicar na semana.
- Upgrade de major: só com tarefa própria, plano e smoke completo.
- Nunca usar `npm audit fix --force` sem plano.
