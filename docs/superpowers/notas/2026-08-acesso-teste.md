# Acesso de teste — Samps (ago/2026)

- URL: https://samps-os.vercel.app
- Plano Vercel: **Hobby (free)** — sem Password Protection / All Deployments
- Proteção escolhida: **Vercel Authentication** com **Standard Protection** (`Require Log In` ativo)
  - Cobre: preview deployments e URLs de deployment geradas
  - **Não** cobre o domínio de Production no Hobby (fica público na borda da Vercel)
- Proteção da Production no Hobby: **login do próprio app** (`/login` + rate limit da Fase 1 + RBAC/RLS). Time da Samps entra com usuário seed/gestão, não com conta Vercel.
- Banco: tratar como **demonstração / desenvolvimento compartilhado** até a gestão confirmar isolamento. Se houver dado de cliente real, criar instância Neon separada para teste, apontar `DATABASE_URL` de Production e rodar `npm run db:seed`.
- Dados: seed de demonstração (`prisma/seed.ts`); não subir arquivo de cliente real durante o teste.
- Usuários de teste: criados pela gestão em `/equipe`, com `mustResetPassword = true` (fluxo `/first-access` já obrigatório no middleware).
- Regras para o time: não subir arquivo de cliente real; reportar bug no canal combinado com a gestão.
- `PRISMA_LOG_QUERIES`: deve permanecer **ausente** em Production.

## Por que não Password Protection

No Hobby, Password Protection e proteção do domínio de Production (**All Deployments**) não estão disponíveis (exigem Pro + add-on ou Enterprise). A decisão do projeto é ficar no free e aceitar Production pública na borda, com auth da aplicação.

## Checklist (Hobby)

1. [x] Vercel Authentication → Require Log In **ON** + Standard Protection (salvar no painel)
2. [ ] Confirmar que um preview (`*.vercel.app` de PR) pede login Vercel
3. [ ] Confirmar que Production abre `/login` do app (esperado no Hobby)
4. [ ] Confirmar ausência de `PRISMA_LOG_QUERIES` em Production
5. [ ] Confirmar se o banco é só seed ou se precisa de branch Neon de teste
