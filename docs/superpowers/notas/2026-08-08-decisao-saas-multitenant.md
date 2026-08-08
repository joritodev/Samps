# Decisão 5.3 — Vender o sistema (SaaS) e backend separado

**Data:** 2026-08-08  
**Pergunta da reunião (28/07):** a Samps pode vender esse sistema para outras agências? Precisa de NestJS?  
**Base técnica:** schema Prisma atual (~38 models no `master` de planejamento; Fase 2 adiciona `Announcement`, `Absence` e campos de perfil → ordem de **~40 models**), RLS por cliente (`app_user`), Next.js 14 + Server Actions + Auth.js.

---

## 1. Três modelos de “vender”

| Modelo | O que é | Esforço de engenharia | Escala |
|--------|---------|----------------------|--------|
| **A. Instância por cliente** | Deploy + banco + env separados por comprador | Baixo–médio (runbook, não rewrite) | Escala com trabalho humano |
| **B. Multi-tenant com `tenantId`** | Um app, N agências isoladas na mesma base | **Alto** — refatoração transversal | Escala com produto |
| **C. Licenciar o método** (Samps Educ) | Vende processo/treinamento, não o software | Zero no código do OS | Já é o negócio da Samps |

Na reunião já ficou claro que as regras são interligadas. Este documento fecha a conta.

---

## 2. O que hoje está amarrado à Samps

- Setores, cargos (`UserType`) e catálogo de `ContentType` pensados no fluxo da agência
- Prioridade e status de atividade configuráveis, mas com semântica Samps
- Portal do cliente + RLS por vínculo `UserClientLink`
- Papéis/permissões seedados para o time interno
- Copy, onboarding e demos com domínios/e-mails Samps

Não é um “CRM genérico” com white-label pronto. É um **sistema operacional de uma agência**.

---

## 3. Custo real do multi-tenant (B)

Contagem aproximada no estado atual:

| Superfície | Ordem de grandeza | Trabalho |
|------------|-------------------|----------|
| Models Prisma | ~40 | quase todos ganham `tenantId` (ou equivalente) |
| Queries / services | dezenas de arquivos em `lib/services`, `app/actions` | filtro obrigatório em **toda** leitura/escrita |
| Policies RLS | hoje centradas em escopo de **cliente** | novo eixo **tenant**; risco alto de vazamento cruzado |
| Auth / convite / seed | 1 org implícita | onboarding, billing, papéis por tenant |
| Operação | 1 Vercel + 1 Neon | suporte, SLA, backup, isolation drills |

**Custo permanente (não só o rewrite):** onboarding de cada agência, suporte, faturamento, atualizações sem quebrar tenant A ao mudar regra do tenant B, e auditoria de isolamento.

Ordem de esforço honesta: **refatoração de produto**, não uma sprint. Comparável a “reescrever a metade do sistema com teste de segurança contínuo”.

**Instância por cliente (A)** reusa o código atual: clonar projeto/env, Neon novo, `migrate deploy`, seed de papéis. Isolamento = isolamento de infraestrutura. O custo é operacional (N bancos), não arquitetural.

---

## 4. Quando NestJS + JWT faz sentido

| Situação | NestJS / API Bearer ajuda? |
|----------|----------------------------|
| Time interno usa o OS no browser (hoje) | **Não** — Server Actions bastam |
| PWA / Capacitor em cima da mesma web | **Não** |
| App nativo (RN) com cliente separado | **Sim** |
| Integrações de terceiros (ERP, Zapier) | **Sim** |
| Multi-tenant com vários clientes de API | **Sim** (ou BFF equivalente) |
| “Fica mais profissional” sem consumidor da API | **Não** — só custo |

Separar backend agora, sem app nativo nem segundo cliente pagante, é **migrar o que já funciona** para pagar manutenção em dobro.

---

## 5. Recomendação em etapas

1. **2026 — provar valor na Samps** (Fases 2–3). Sem segundo cliente, não há SaaS.
2. Se aparecer comprador real com contrato: **instância por cliente (A)** — deploy dedicado, banco dedicado, preço que pague o setup.
3. **Licenciar o método (C)** continua válido em paralelo (Samps Educ) e não compete com o código.
4. **Multi-tenant (B)** só com contrato assinado que financie a refatoração + Security Review contínuo.
5. **NestJS** só quando (2) ou app nativo exigir API; não como pré-requisito de “vender”.

**Recomendação única:** não construir multi-tenant nem NestJS em 2026. Se for vender software, vender **instância isolada**. Se for escalar ensino, vender o **método**.

**Decisão pedida à gestão:** escolher entre (A) instância sob demanda, (C) só método, ou “não vender software em 2026” — e descartar (B) até haver receita que pague o rewrite.
