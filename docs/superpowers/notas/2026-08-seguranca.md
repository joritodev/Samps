# Revisão de segurança — Fase 1 (ago/2026)

**Data:** 2026-08-07

| Achado | Severidade | Decisão | Onde tratar |
|--------|-----------|---------|-------------|
| Deployment Protection ausente (`/login` = HTTP 200) | alta | corrigir agora (humano na Vercel) | Task 4 — checklist em `2026-08-acesso-teste.md` |
| `npm audit` high residual no Next 14.x (sem patch no major) | alta (mitigada) | aceitar até upgrade major; job `audit` com `continue-on-error` | Fase 3/4 — Next 16; ver `2026-08-dependencias.md` |
| Comment/WorkSession sem RLS (pré-Task 7) | alta | corrigido | migration + WITH CHECK alinhado ao USING |
| Race no rate limit (check-then-act) | média | corrigido | `pg_advisory_xact_lock` em `isLoginBlocked` |
| Counts sem índice em AccessAttemptLog | média | corrigido | índices na mesma migration |
| TruffleHog `@main` | média | corrigido | pin SHA v3.96.0 |
| CSP em Report-Only | média | próxima fase | Fase 3.7 enforce |
| `check:rls` não rodou neste ambiente (sem DATABASE_URL) | média | corrigir agora (pós-deploy) | rodar após `migrate deploy` |
| Attachment com `clientId` null na policy SQL | média | próxima fase | revisar `app_can_access_client`; check-rls já flagra null órfão |
| CI checks ainda não marcados como required no GitHub | média | corrigir agora (humano) | required: `verify` + `secrets` (não `audit` até Next 16) |
| Rate limit depende de `x-forwarded-for` (confiável só atrás da Vercel) | baixa | aceitar risco | documentado; Vercel define o header |

## Corrigido nesta fase

- CVE crítica do Next (14.2.15 → 14.2.35) — PR #17  
- Headers e CSP (report-only) — PR #18  
- Rate limit de login (5/15min e-mail, 20/IP)  
- Nota de acesso de teste + pendência explícita de Deployment Protection  
- CI (`tsc`, lint, test, build) + Security (TruffleHog + npm audit)  
- Vitest com regras de status, escopo, rate limit e permissão  
- RLS ampliado (Comment, WorkSession) + script `check:rls` expandido  

## Pendências aceitas / humanas até setembro

- **Humano:** ativar Deployment Protection (bloqueia saída “URL protegida” até feito)  
- **Humano:** required status checks no GitHub (`verify`, `secrets`, `audit`)  
- **Humano/ops:** `npm run check:rls` após migrate no banco real  
- CSP em enforce (Fase 3)  
- Upgrade major Next para zerar highs do audit (Fase 3/4)  
- Attachment `clientId` null (Fase 3)

## Gates desta entrega

- Bugbot / Security Review: despachar sobre o PR da fase restante antes do merge  
- `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build` — rodar no PR  
