# Acesso de teste — Samps (ago/2026)

- URL: https://samps-os.vercel.app
- Proteção: **PENDENTE** — em 2026-08-07, `curl` em `/login` retornou **HTTP 200** (sem challenge da Vercel). Headers de segurança da Fase 1 Task 2 já aparecem (CSP Report-Only, X-Frame-Options, etc.).
- Ação humana obrigatória: `Vercel → samps-os → Settings → Deployment Protection` — ativar proteção em **Preview** e **Production** (Password Protection ou Vercel Authentication com convidados). Depois disso, `curl` deve retornar `401` (ou redirect para a tela de proteção), não `200`.
- Banco: tratar como **demonstração / desenvolvimento compartilhado** até a gestão confirmar isolamento. Se houver dado de cliente real, criar instância Neon separada para teste, apontar `DATABASE_URL` de Production e rodar `npm run db:seed`.
- Dados: seed de demonstração (`prisma/seed.ts`); não subir arquivo de cliente real durante o teste.
- Usuários de teste: criados pela gestão em `/equipe`, com `mustResetPassword = true` (fluxo `/first-access` já obrigatório no middleware).
- Regras para o time: não subir arquivo de cliente real; reportar bug no canal combinado com a gestão.
- `PRISMA_LOG_QUERIES`: deve permanecer **ausente** em Production (conferir Environment Variables na Vercel).

## Checklist pós-proteção (humano)

1. Ativar Deployment Protection (Production + Preview)
2. Confirmar `curl -s -o /dev/null -w "%{http_code}" https://samps-os.vercel.app/login` ≠ `200` sem autenticação Vercel
3. Confirmar ausência de `PRISMA_LOG_QUERIES` em Production
4. Confirmar se o banco é só seed ou se precisa de branch Neon de teste
5. Atualizar este arquivo marcando Proteção como ativa e o estado do banco
