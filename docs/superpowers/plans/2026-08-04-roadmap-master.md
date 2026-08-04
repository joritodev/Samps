# Samps OS — Roadmap Master (ago → set 2026)

**Data:** 2026-08-04
**Origem:** reunião Samps Digital 28/07/2026 + backlog técnico pendente
**Meta do cliente:** time testando em agosto, sistema operacional em setembro
**Próxima reunião:** 18/08/2026

Este documento é o índice. Cada fase tem um plano próprio em `docs/superpowers/plans/`.
Nenhuma fase começa antes de a anterior ter PR mergeado e gate de revisão aprovado.

---

## 1. Estado real hoje (verificado no repo)

| Fato | Detalhe |
|------|---------|
| Branch atual | `feat/escopo-contrato-quantificado` (sem commits além do master) |
| `stash@{0}` | Escopo de contrato quantificado + fix de build do deploy (`.gitignore`, `package.json` postinstall, remoção de `/notificacoes` duplicada) |
| `stash@{1}` | Ações da demanda por status (`fix/demand-actions-by-status`) |
| Produção | https://samps-os.vercel.app (build passou, mas o fix de build **não está commitado**) |
| Segurança já existente | RLS com role `app_user`, `AccessAttemptLog`, sistema de permissões, `.env` no `.gitignore`, sem segredos versionados |
| Risco aberto | `next@14.2.15` com CVE (aviso no build da Vercel), sem rate limit no login, sem headers de segurança, sem CI, URL pública sem Deployment Protection |

**Conclusão:** existe trabalho pronto fora do versionamento. A Fase 0 é obrigatória antes de qualquer feature nova.

---

## 2. Divisão de responsabilidade por modelo

| Atividade | Modelo | Motivo |
|-----------|--------|--------|
| Planejamento, design de schema, decisões de segurança, revisão de arquitetura | **Opus 5** | Contexto largo, consequência alta |
| Execução mecânica (UI, CRUD, wiring de páginas, refactor guiado) | **cursor-grok-4.5-high-fast** | Rápido e barato para tarefas descritas |
| Tarefas triviais e correções pontuais | **Auto** | Roteamento automático |
| Revisão de código por fase | subagente **Bugbot** | Bugs e regressões |
| Revisão de segurança por fase | subagente **Security Review** | Vazamento, authz, injeção |

Regra: se durante a execução o modelo rápido precisar **mudar schema, permissão ou fluxo de auth**, ele para e devolve para replanejamento no Opus 5.

---

## 3. Convenções de versionamento

- **Uma branch por fatia**, nunca por fase inteira: `feat/<fatia>`, `fix/<fatia>`, `chore/<fatia>`, `sec/<fatia>`.
- **Conventional Commits** em português: `feat(clientes): campos de aniversario e endereco`.
- **Commit por tarefa concluída**, não por fase. Cada commit precisa deixar `npx tsc --noEmit` limpo.
- **PR por fatia**, com descrição do que testar. Merge só depois dos dois gates (Bugbot + Security Review) quando a fatia tocar dados, auth ou upload.
- **Proibido commitar:** `.env`, `.env.*`, `.vercel/`, `.superpowers/`, `_e.txt`, dumps de banco, prints com dados de cliente real.
- Migrations Prisma sempre em commit próprio, junto do código que as usa.

---

## 4. Gates obrigatórios por fatia

1. `npx tsc --noEmit` limpo
2. `npm run lint` sem erro novo
3. `npm run build` passa (obrigatório em qualquer fatia que mexa em rota, layout ou schema)
4. Smoke manual descrito no plano da fase
5. **Bugbot** em fatias com lógica de negócio
6. **Security Review** em fatias com auth, permissão, upload, dado pessoal ou query nova

---

## 5. Fases

| Fase | Plano | Janela | Objetivo |
|------|-------|--------|----------|
| **0** | `2026-08-04-fase0-recuperar-pendencias.md` | 04–06/ago | Trazer stashes para o versionamento, fechar escopo de contrato e ações por status, commitar fix de build |
| **1** | `2026-08-04-fase1-seguranca-hardening.md` | 06–11/ago | CVE do Next, headers, rate limit, Deployment Protection, secret scanning, CI, verificação de RLS |
| **2** | `2026-08-04-fase2-features-reuniao.md` | 11–18/ago | Entregáveis prometidos para a reunião do dia 18 |
| **3** | `2026-08-04-fase3-operacional-setembro.md` | 19/ago–05/set | Fechar o uso diário: anexos, relatórios por tipo, briefing de vídeo, visibilidade, mobile |
| **4** | `2026-08-04-fase4-avancado.md` | 08–19/set | Colunas por cliente, capacidade 8h, agenda organizacional |
| **5** | `2026-08-04-fase5-pesquisa-decisoes.md` | paralelo, 1-pagers até 18/ago | IA, app mobile, SaaS/NestJS — documentos de decisão, sem código de produção |

Fases 0, 1 e 2 estão detalhadas tarefa a tarefa. Fases 3, 4 e 5 estão com escopo, arquivos e critério de aceite; cada uma recebe plano detalhado no Opus 5 **imediatamente antes** de entrar em execução, para não planejar em cima de suposição.

---

## 6. Cobertura da reunião de 28/07

| Pedido da reunião | Fase |
|-------------------|------|
| Dados do cliente (endereço, aniversário) + aniversário na agenda | 2 |
| Mural/banner de avisos na home (aniversariantes, urgentes) | 2 |
| Registro de ausências (folga, férias, offline) | 2 |
| Links de contrato e estudo no painel do cliente | 2 |
| Remover restrição / abrir visualização de demandas ao time | 3 (confirmar semântica com a Samps antes) |
| Cronômetro por demanda | já existe — validar na Fase 0 |
| Relatórios de performance por usuário e por tipo | 3 |
| Ajuste da agenda (eventos e prazos) | 2 (parcial) + 4 (agenda organizacional) |
| Anexos nas demandas | 3 |
| Campos obrigatórios antes de criar demanda | já existe — reforço na Fase 3 (vídeo) |
| Link do Drive obrigatório ao concluir | já existe — validar na Fase 0 |
| Categorias padronizadas de vídeo | 3 |
| Colunas personalizadas por cliente | 4 |
| Cálculo de capacidade / 8h por pessoa | 4 |
| Regras de pontuação e priorização | 3 (depende das regras que a Samps vai enviar) |
| Comunicação centralizada (sem WhatsApp) | 3 (comentários) + backlog futuro (chat) |
| Liberar acesso ao time para teste | 1 (com Deployment Protection) |
| Avaliar assistente de IA | 5 |
| Avaliar exportação como app mobile | 5 |
| Vender o sistema / SaaS | 5 |

---

## 7. Fora de escopo até setembro

- Migração para NestJS + JWT Bearer (rewrite de API)
- Multi-tenant / white-label vendável
- Chat em tempo real
- App nativo em loja
- Assistente de IA em produção

Esses itens só saem de "pesquisa" depois que o operacional de setembro estiver em uso real.

---

## 8. Riscos

| Risco | Mitigação |
|-------|-----------|
| Escopo da reunião maior que a janela até setembro | Fases 4 e 5 explicitamente fora do "operacional" |
| Trabalho perdido em stash | Fase 0 antes de tudo |
| Vazamento de dado de cliente real no teste do time | Fase 1: Deployment Protection + seed de demonstração + RLS verificado |
| CVE do Next em produção | Fase 1, primeira tarefa |
| Neon suspendendo compute em teste | Fase 1: nota operacional + retry/timeout na connection string |
| Modelo rápido alterando schema sem revisão | Regra da seção 2 |
